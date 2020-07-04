import type { Flat, NodeId, NodeMap } from '@/semantics';
import {
  ApplyNode, BinOpNode, BoolNode, ConditionalNode, LambdaArgNode, LambdaNode, NotNode, NumberNode, OpNode, ReferenceNode as ReferenceNode, StrNode 
} from '@/semantics/defs';
import type { Semantics } from '@/semantics/transform';
import {
  createBoolNode, createNumberNode, createStrNode, getKindForNode, getValueForName 
} from '@/semantics/util';
import {
  DRF, mapIterable, withoutParent, withParent 
} from '@/util/helper';
import { cloneNodeDeep, findNodesDeep, getRootForNode } from '@/util/nodes';
import { castDraft, produce } from 'immer';
import { combineReducers, compose } from 'redux';
import * as animate from '../gfx/animate';
import * as gfx from '../gfx/core';
import {
  ActionKind, createDetach, createEvalApply, createEvalConditional, createEvalLambda, createEvalNot, createEvalOperator, createEvalReference, createMoveNodeToBoard, createStep, ReductAction 
} from './action';
import { MissingNodeError, NotOnBoardError, WrongTypeError } from './errors';
import { GlobalState, RState, GameMode } from './state';
import { undoable } from './undo';
import { checkVictory, checkDefeat } from './helper';

export { nextId } from '@/util/nodes';

const initialProgram: RState = {
  mode: GameMode.Gameplay,
  nodes: new Map(),
  goal: new Set(),
  board: new Set(),
  toolbox: new Set(),
  globals: new Map(),
  added: new Map(),
  removed: new Set()
};


// To speed up type checking, we only type check nodes that have
// changed.
let dirty = new Set<NodeId>();
function markDirty(nodes: NodeMap, id: NodeId) {
  let node = nodes.get(id)!; // warning: assuming node w/ given ID exists
  let parentId = node.parent;

  // travel to the root node
  while (typeof parentId === 'number') {
    node = nodes.get(parentId)!;
    parentId = node.parent;
  }

  // add root node to dirty set
  dirty.add(node.id);
}

/**
 * The core reducer for Reduct-Redux. Interprets actions and generates
 * the new state. Needs a semantics module and the views, in order to
 * record positions of objects on the board for undo/redo.
 *
 * @param {Function} restorePos - a function that transforms the
 * position of a view after undo/redo. Useful to adjust positions so
 * that things stay within bounds (e.g. if the game has resized since
 * the view's position was recorded).
 */
export function reduct(semantics: Semantics, views, restorePos) {
  function program(state = initialProgram, act?: ReductAction): RState {
    if (!act) return state;
    
    switch (act.type) {
    case ActionKind.StartLevel: {
      act.nodes.forEach((n) => markDirty(act.nodes, n.id));
      act.toolbox.forEach((n) => markDirty(act.nodes, n));

      return {
        nodes: act.nodes,
        goal: act.goal,
        board: act.board,
        toolbox: act.toolbox,
        globals: act.globals,
        added: new Map(mapIterable(act.nodes.keys(), id => [id, null] as const)),
        removed: new Set(),
        stacks: []
      };
    }

    case ActionKind.EvalLambda: {
      const { lambdaNodeId, paramNodeId } = act;

      // for now, this is the same thing as beta-reduce, except handled entirely
      // in the reducer where it should be - iaa34

      if (!state.board.has(getRootForNode(lambdaNodeId, state.nodes).id))
        throw new NotOnBoardError(lambdaNodeId);

      const lambdaNode = state.nodes.get(lambdaNodeId) as DRF<LambdaNode>;

      let argNodeId: NodeId;
      let argName: string;

      state = produce(state, draft => {
        // node that represents lambda argument in function signature
        const argNode = draft.nodes.get(lambdaNode.subexpressions.arg) as Flat<LambdaArgNode>;
        argNode.fields.value = paramNodeId;
        argNodeId = argNode.id;
        argName = argNode.fields.name;
      });

      // find all of the references who point to this arg

      const referenceNodes = findNodesDeep(
        lambdaNode.subexpressions.body, 
        state.nodes,
        (nodeToMatch) => nodeToMatch.type === 'reference' && nodeToMatch.fields.name === argName,
        (nodeToFilter, nodeMap) => {
          // don't bother searching inside of nodes that redefine the name in
          // their own scope, such as lambdas with the same arg name
          if (nodeToFilter.type === 'lambda') {
            const nodeToFilterArg = nodeMap.get(nodeToFilter.subexpressions.arg) as DRF<LambdaArgNode>;
            if (nodeToFilterArg.fields.name === argName) return false;
          }

          return true;
        });

      const added: Array<[NodeId, NodeId | null]> = [];

      // eval all relevant references and keep track of which nodes are created
      for (const referenceNode of referenceNodes) {
        state = program(state, createEvalReference(referenceNode.id));
        added.push(...state.added);
      }

      // delete param node and move body outwards
      const paramNodeDescendants = findNodesDeep(paramNodeId, state.nodes, () => true);

      return produce(
        state,
        draft => {
          draft.added = new Map(added);
          
          const bodyNode = draft.nodes.get(lambdaNode.subexpressions.body)!;
          
          if (lambdaNode.parent) {
            bodyNode.parent = lambdaNode.parent;
            bodyNode.parentField = lambdaNode.parentField;

            const lambdaParent = draft.nodes.get(lambdaNode.parent)!;
            (lambdaParent.subexpressions as Record<string, NodeId>)[lambdaNode.parentField!] = bodyNode.id;
            draft.added.set(bodyNode.id, lambdaNode.id);
          } else {
            bodyNode.parent = null;
            bodyNode.parentField = null;

            if (bodyNode.type === 'vtuple') {
              for (const subExprId of Object.values(bodyNode.subexpressions)) {
                const subExpr = draft.nodes.get(subExprId)!;
                subExpr.parent = null;
                subExpr.parentField = null;
                draft.board.add(subExprId);
                draft.added.set(subExprId, lambdaNode.id);
              }
            } else {
              draft.board.add(bodyNode.id);
              draft.added.set(bodyNode.id, lambdaNode.id);
            }
          }

          // param node should be consumed from board or toolbox
          draft.board.delete(paramNodeId);
          draft.toolbox.delete(paramNodeId);


          // lambda node is no longer needed, eliminate it
          draft.board.delete(lambdaNode.id);
          draft.board.delete(argNodeId);

          // mark these nodes for cleanup
          draft.removed.add(lambdaNode.id);
          draft.removed.add(argNodeId);
          draft.removed.add(paramNodeId);

          // descendants are no longer needed, eliminate them
          for (const paramNodeDescendant of paramNodeDescendants) {
            draft.removed.add(paramNodeDescendant.id);
          }
        });
    }

    case ActionKind.EvalOperator: {
      // for now, this is the same thing as small-stepping a binary operator,
      // except handled entirely in the reducer where it should be - iaa34
      if (!state.board.has(getRootForNode(act.operatorNodeId, state.nodes).id))
        throw new NotOnBoardError(act.operatorNodeId);
      
      const binOpNode = state.nodes.get(act.operatorNodeId) as DRF<BinOpNode>;
      const opNode = state.nodes.get(binOpNode.subexpressions.op) as DRF<OpNode>;
      
      const leftNode = state.nodes.get(binOpNode.subexpressions.left) as DRF;
      const rightNode = state.nodes.get(binOpNode.subexpressions.right) as DRF;

      if (leftNode.type === 'missing')
        throw new MissingNodeError(leftNode.id);

      if (rightNode.type === 'missing')
        throw new MissingNodeError(rightNode.id);

      let resultValue: boolean | number | string;

      switch (opNode.fields.name) {
      case '+':
      {
        if (leftNode.type !== 'number' && leftNode.type !== 'string')
          throw new WrongTypeError(leftNode.id, ['number', 'string'], leftNode.type);
  
        if (rightNode.type !== leftNode.type)
          throw new WrongTypeError(rightNode.id, leftNode.type, rightNode.type);
  
        const leftValue = leftNode.fields.value;
        const rightValue = rightNode.fields.value;
  
        // cast to any b/c we have already verified that these are the same type
        resultValue = leftValue as any + rightValue;
        break;
      }
      case '-':
      case '>':
      case '<':
      {
        if (leftNode.type !== 'number')
          throw new WrongTypeError(leftNode.id, ['number'], leftNode.type);

        if (rightNode.type !== 'number')
          throw new WrongTypeError(rightNode.id, ['number'], rightNode.type);

        const leftValue = leftNode.fields.value;
        const rightValue = rightNode.fields.value;

        switch (opNode.fields.name) {
        case '-': resultValue = leftValue - rightValue; break;
        case '>': resultValue = leftValue > rightValue; break;
        case '<': resultValue = leftValue < rightValue; break;
        }
        break;
      }
      case '&&':
      case '||':
      {
        if (leftNode.type !== 'boolean')
          throw new WrongTypeError(leftNode.id, ['boolean'], leftNode.type);

        if (rightNode.type !== 'boolean')
          throw new WrongTypeError(rightNode.id, ['boolean'], rightNode.type);

        const leftValue = leftNode.fields.value;
        const rightValue = rightNode.fields.value;

        switch (opNode.fields.name) {
        case '&&': resultValue = leftValue && rightValue; break;
        case '||': resultValue = leftValue || rightValue; break;
        }
        break;
      }
      case '==':
      {
        if (leftNode.type !== 'number' 
          && leftNode.type !== 'string'
          && leftNode.type !== 'boolean'
          && leftNode.type !== 'symbol')
          throw new WrongTypeError(leftNode.id, ['number', 'string', 'boolean', 'symbol'], leftNode.type);
  
        if (rightNode.type !== leftNode.type)
          throw new WrongTypeError(rightNode.id, leftNode.type, rightNode.type);

        const leftValue = leftNode.type === 'symbol' ? leftNode.fields.name : leftNode.fields.value;
        const rightValue = rightNode.type === 'symbol' ? rightNode.fields.name : rightNode.fields.value;

        resultValue = leftValue === rightValue;
        break;
      }
      }

      let resultNode: BoolNode | NumberNode | StrNode;

      if (typeof resultValue === 'boolean')
        resultNode = createBoolNode(resultValue);
      
      if (typeof resultValue === 'number')
        resultNode = createNumberNode(resultValue);

      if (typeof resultValue === 'string')
        resultNode = createStrNode(resultValue);

      return produce(state, draft => {
        draft.board.delete(binOpNode.id);
        draft.board.delete(opNode.id);
        draft.board.delete(leftNode.id);
        draft.board.delete(rightNode.id);

        draft.added.clear();
        draft.added.set(resultNode.id, binOpNode.id);

        if (binOpNode.parent) {
          const parentNode = draft.nodes.get(binOpNode.parent)!;
          resultNode.parent = binOpNode.parent;
          resultNode.parentField = binOpNode.parentField;
          parentNode.subexpressions[binOpNode.parentField!] = resultNode.id;
        } else {
          draft.board.add(resultNode.id);
        }

        draft.nodes.set(resultNode.id, resultNode);

        // schedule for cleanup
        draft.removed.add(binOpNode.id);
        draft.removed.add(opNode.id);
        draft.removed.add(leftNode.id);
        draft.removed.add(rightNode.id);
      });
    }
    
    case ActionKind.EvalConditional: {
      if (!state.board.has(getRootForNode(act.conditionalNodeId, state.nodes).id))
        throw new NotOnBoardError(act.conditionalNodeId);

      // conditional block
      const blockNode = state.nodes.get(act.conditionalNodeId) as DRF<ConditionalNode>;
      // conditional condition
      const condNode = state.nodes.get(blockNode.subexpressions.condition)!;

      const positiveNode = state.nodes.get(blockNode.subexpressions.positive)!;
      const negativeNode = state.nodes.get(blockNode.subexpressions.negative)!;

      if (condNode.type !== 'boolean')
        throw new WrongTypeError(condNode.id, ['boolean'], condNode.type);

      if (negativeNode.type === 'missing')
        throw new MissingNodeError(negativeNode.id);

      if (positiveNode.type === 'missing')
        throw new MissingNodeError(positiveNode.id);

      let resultNode = condNode.fields.value ? positiveNode : negativeNode;
      const removedNode = !condNode.fields.value ? positiveNode : negativeNode;

      return produce(state, draft => {
        draft.board.delete(blockNode.id);
        draft.board.delete(condNode.id);
  
        draft.added.clear();
        draft.added.set(resultNode.id, blockNode.id);

        if (blockNode.parent) {
          const parentNode = draft.nodes.get(blockNode.parent)!;
          parentNode.subexpressions[blockNode.parentField!] = resultNode.id;
          resultNode = withParent(resultNode, parentNode.id, blockNode.parentField!);
        } else {
          resultNode = withoutParent(resultNode);
          draft.board.add(resultNode.id);
        }
  
        draft.nodes.set(resultNode.id, resultNode);

        // schedule for cleanup
        draft.removed.add(blockNode.id);
        draft.removed.add(condNode.id);
        draft.removed.add(removedNode.id);
      });
    }

    case ActionKind.EvalNot: {
      if (!state.board.has(getRootForNode(act.notNodeId, state.nodes).id))
        throw new NotOnBoardError(act.notNodeId);

      const notNode = state.nodes.get(act.notNodeId) as DRF<NotNode>;
      const valueNode = state.nodes.get(notNode.subexpressions.value)!;

      if (valueNode.type === 'missing')
        throw new MissingNodeError(valueNode.id);
      
      if (valueNode.type !== 'boolean')
        throw new WrongTypeError(valueNode.id, ['boolean'], valueNode.type);

      let resultNode = createBoolNode(!valueNode.fields.value);

      return produce(state, draft => {
        draft.board.delete(notNode.id);
  
        draft.added.clear();
        draft.added.set(resultNode.id, notNode.id);

        if (notNode.parent) {
          const parentNode = draft.nodes.get(notNode.parent)!;
          parentNode.subexpressions[notNode.parentField!] = resultNode.id;
          resultNode = withParent(resultNode, parentNode.id, notNode.parentField!);
        } else {
          resultNode = withoutParent(resultNode);
          draft.board.add(resultNode.id);
        }
  
        draft.nodes.set(resultNode.id, resultNode);

        // schedule for cleanup
        draft.removed.add(notNode.id);
      });
    }

    case ActionKind.EvalApply: {
      const { applyNodeId } = act;

      if (!state.board.has(getRootForNode(applyNodeId, state.nodes).id))
        throw new NotOnBoardError(applyNodeId);

      const applyNode = state.nodes.get(applyNodeId) as DRF<ApplyNode>;
      const argNode = state.nodes.get(applyNode.subexpressions.argument)!;
      const calleeNode = state.nodes.get(applyNode.subexpressions.callee)!;

      if (argNode.type === 'missing')
        throw new MissingNodeError(argNode.id);

      if (calleeNode.type === 'missing')
        throw new MissingNodeError(calleeNode.id);

      if (calleeNode.type !== 'lambda')
        throw new WrongTypeError(calleeNode.id, 'lambda', calleeNode.type);
      
      state = program(state, createEvalLambda(argNode.id, calleeNode.id));

      // there should only be one added node after evaluating the lambda, and it
      // should be the result of evaluating the lambda
      const resultNodeId = [...state.added.keys()][0];

      return produce(state, draft => {
        draft.board.delete(applyNode.id);

        // set the source of the nodes to the application node instead of the
        // lambda node
        for (const [addedNode, sourceNode] of draft.added) {
          if (sourceNode === calleeNode.id) {
            draft.added.set(addedNode, applyNode.id);
          }
        }
        
        const resultNode = draft.nodes.get(resultNodeId)!;

        if (applyNode.parent) {
          const parentNode = draft.nodes.get(applyNode.parent)!;
          parentNode.subexpressions[applyNode.parentField!] = resultNodeId;
          resultNode.parent = parentNode.id;
          resultNode.parentField = applyNode.parentField;
        } else {
          resultNode.parent = null;
          resultNode.parentField = null;
          draft.board.add(resultNode.id);
        }

        // schedule for cleanup
        draft.removed.add(applyNode.id);
      });
    }

    case ActionKind.EvalReference: {
      const { referenceNodeId } = act;

      if (!state.board.has(getRootForNode(referenceNodeId, state.nodes).id))
        throw new NotOnBoardError(referenceNodeId);

      const referenceNode = state.nodes.get(referenceNodeId) as DRF<ReferenceNode>;
      const targetId = getValueForName(referenceNode.fields.name, referenceNode, state);

      if (targetId === undefined || targetId === null)
        throw new Error(`The name ${referenceNode.fields.name} is not defined in this scope`);

      const [clonedNode, , newNodeMap] = 
        cloneNodeDeep(targetId, state.nodes);

      state = { ...state, nodes: newNodeMap };
      
      return produce(state, draft => {
        draft.nodes = castDraft(newNodeMap);
        draft.board.delete(referenceNode.id);
        
        // retrieve inside of produce() so we get a mutable draft object
        const resultNode = draft.nodes.get(clonedNode.id)!;

        if (referenceNode.parent) {
          const parentNode = draft.nodes.get(referenceNode.parent)!;
          parentNode.subexpressions[referenceNode.parentField!] = resultNode.id;
          resultNode.parent = parentNode.id;
          resultNode.parentField = referenceNode.parentField;
        } else {
          resultNode.parent = null;
          resultNode.parentField = null;
          draft.board.add(resultNode.id);
        }

        draft.added.clear();
        draft.added.set(resultNode.id, referenceNode.id);

        // schedule for cleanup
        draft.removed.add(referenceNode.id);
      });
    }

    case ActionKind.Cleanup: {
      const { target } = act;
      if (!state.removed.has(target)) return state;

      return produce(state, draft => {
        draft.nodes.delete(target);
        draft.removed.delete(target);
      });
    }

    case ActionKind.MoveNodeToBoard: {
      if (state.board.has(act.nodeId))
        return state;

      const node = state.nodes.get(act.nodeId)!;

      if (state.toolbox.has(act.nodeId)) {
        return produce(state, draft => {
          draft.added.clear();
            
          // if there is a meta tag that specifies unlimited uses, clone the node 
          // instead of moving it
          if (node.__meta?.toolbox?.unlimited) {
            const [clonedNode, clonedDescendants, newNodeMap] = cloneNodeDeep(act.nodeId, state.nodes);
  
            draft.nodes = castDraft(newNodeMap);

            // a Set iterates in insertion order; we want the new toolbox to be
            // in the same order as the old one
            const toolbox = [...draft.toolbox];
            const idx = toolbox.findIndex(id => id === act.nodeId);
            toolbox[idx] = clonedNode.id;
            draft.toolbox = new Set(toolbox);
            
            draft.added.set(clonedNode.id, act.nodeId);
            for (const clonedDescendant of clonedDescendants) {
              draft.added.set(clonedDescendant.id, act.nodeId);
            }
          } else {
            draft.toolbox.delete(act.nodeId);
          }

          draft.board.add(act.nodeId);
        });
      }

      // if it's not in the board and not in the toolbox, just detach it
      // TODO: handle defs

      if (node.parent) {
        return program(state, createDetach(node.id));
      }

      return state;
    }

    case ActionKind.MoveNodeToSlot: {
      const { slotId, nodeId } = act;

      state = program(state, createMoveNodeToBoard(nodeId));

      const newState = produce(state, draft => {
        const slot = draft.nodes.get(slotId)!;

        // this should be impossible
        if (!slot.parent) 
          throw new Error(`Slot ${slotId} has no parent!`);
  
        const parent = draft.nodes.get(slot.parent)!;
        const child = draft.nodes.get(nodeId)!;

        draft.board.delete(nodeId);

        // Cache the hole in the parent, so that we don't have to create a new
        // hole if the user detaches this child later
        if (!parent.__meta)
          parent.__meta = {};

        if (!parent.__meta.slots)
          parent.__meta.slots = {};

        parent.__meta.slots[slot.parentField!] = slotId;

        parent.subexpressions[slot.parentField!] = child.id;
        child.parentField = slot.parentField;
        child.parent = slot.parent;
        child.locked = false;
      });

      markDirty(newState.nodes, act.nodeId);

      return newState;
    }

    case ActionKind.MoveNodeToDefs: {
      const { nodeId } = act;

      const defNode = state.nodes.get(nodeId)!;

      if (defNode.type !== 'define')
        throw new WrongTypeError(nodeId, 'define', defNode.type);

      return produce(state, draft => {
        draft.globals.set(defNode.fields.name, nodeId);
        draft.board.delete(nodeId);
      });
    }

    case ActionKind.Step: {
      const { targetNodeId } = act;

      const targetNode = state.nodes.get(targetNodeId)!;
      const targetNodeKind = getKindForNode(targetNode, state.nodes);

      if (targetNodeKind !== 'expression') {
        // TODO: more specific error type
        throw new Error('This node is not an expression');
      }

      for (const [name, childId] of Object.entries(targetNode.subexpressions)) {
        const childNode = state.nodes.get(childId)!;
        const childNodeKind = getKindForNode(childNode, state.nodes);

        // for conditional nodes, we don't want to step the contents of the if
        // block or the else block, we just want to evaluate the condition and
        // then return one of the blocks
        if (targetNode.type === 'conditional' && name !== 'condition') {
          continue;
        }

        // don't evaluate references unless they are being applied
        if (targetNode.type !== 'apply' && childNode.type === 'reference') {
          continue;
        }

        // this is a child node that needs further evaluation, return the result
        // of stepping it once
        if (childNodeKind !== 'value' && childNodeKind !== 'syntax') {
          return program(state, createStep(childId));
        }
      }

      // if we are here, all of the child nodes are fully stepped so we should
      // just step this node
      switch (targetNode.type) {
      case 'apply':
        return program(state, createEvalApply(targetNode.id));
      case 'binop':
        return program(state, createEvalOperator(targetNode.id));
      case 'conditional':
        return program(state, createEvalConditional(targetNode.id));
      case 'not':
        return program(state, createEvalNot(targetNode.id));
      case 'reference':
        return program(state, createEvalReference(targetNode.id));
      default:
        throw new Error(`Cannot step a ${targetNode.type}`);
      }
    }

    case ActionKind.DetectCompletion: {
      if (checkVictory(state))
        return { ...state, mode: GameMode.Victory };

      if (checkDefeat(state))
        return { ...state, mode: GameMode.Defeat };

      return state;
    }

    case ActionKind.Raise: {
      if (state.board.has(act.nodeId)) {
        return produce(state, draft => {
          draft.board.delete(act.nodeId);
          draft.board.add(act.nodeId);
        });
      }

      return state;
    }

    case ActionKind.SmallStep: {
      // console.log("@@SMALL_STEP_REDUCE@@");
      const oldNode = state.nodes.get(act.topNodeId)!;

      if (oldNode.parent && act.newNodeIds.length !== 1)
      // TODO: handle this more gracefully? Create a vtuple?
      // TODO: handle when an expression doesn't create anything??
        throw new Error('Cannot small-step a child expression to multiple new expressions.');
          
      const newNodeId = act.newNodeIds[0];

      let newState = produce(state, draft => {
        // update the node map
        for (const node of act.addedNodes) {
          draft.nodes.set(node.id, node);
        }

        // update the board
        draft.board.delete(act.topNodeId);

        // if the old node was a top level node, add the nodes that it was
        // turned into to the board
        if (!oldNode.parent)
          for (const newNodeId of act.newNodeIds)
            draft.board.add(newNodeId);
      });

      // nodes that are added in the first part are not drafted
      // by Immer since they come from outside, so we need to
      // call produce() again in order to be able to edit them

      newState = produce(newState, draft => {
        if (oldNode.parent) {
          const parent = draft.nodes.get(oldNode.parent)!;
          parent.subexpressions[oldNode.parentField] = act.newNodeIds[0];

          const child = draft.nodes.get(newNodeId)!;
          child.parent = parent.id;
          child.parentField = oldNode.parentField;
        }
      });

      act.newNodeIds.forEach((id) => markDirty(newState.nodes, id));
      
      return newState;
    }

    case ActionKind.AddToolboxItem: {
      return produce(state, draft => {
        for (const node of act.addedNodes) {
          draft.nodes.set(node.id, node);
        }

        draft.toolbox.add(act.newNodeId);
      });
    }

    case ActionKind.AddGoalItem: {
      return produce(state, draft => {
        for (const node of act.addedNodes) {
          draft.nodes.set(node.id, node);
        }

        draft.goal.add(act.newNodeId);
      });
    }

    case ActionKind.AddBoardItem: {
      return produce(state, draft => {
        for (const node of act.addedNodes) {
          draft.nodes.set(node.id, node);
        }

        for (const nodeId of act.newNodeIds) {
          draft.board.add(nodeId);
        }

        draft.board.add(act.newNodeId);
      });
    }

    case ActionKind.ChangeGoal: {
      const newNodes = state.nodes
        .withMutations((n) => {
          for (const node of act.addedNodes) {
            n.set(node.id, node);
          }
        });

      const len = state.goal.size;

      let newGoal = state.goal;
      newGoal = newGoal.splice(act.goal_id, 1, ...act.newNodeIds);

      return state
        .set('nodes', newNodes)
        .set('goal', newGoal);
    }

    case ActionKind.Unfold: {
      const nodes = state.nodes;
      const ref = nodes.get(act.nodeId);

      let newState = state
        .set('nodes', nodes.withMutations((n) => {
          for (const node of act.addedNodes) {
            n.set(node.id, node);
          }

          if (ref.has('parent')) {
            const parentId = ref.parent;
            n.set(
              parentId,
              n.get(parentId).set(ref.parentField, act.newNodeId)
            );
            n.set('locked', true);
          }
        }));

      if (!ref.has('parent')) {
        newState = newState
          .set('board', state.board.map((id) => (id === act.nodeId ? act.newNodeId : id)));
      }

      return newState;
    }

    case ActionKind.BetaReduce: {
      const queue = [act.topNodeId, act.argNodeId];
      const removedNodes = new Set<number>();

      const addedNodes = act.addedNodes.map((n) => {
        const id = n.id;
        if (act.newNodeIds.indexOf(id) >= 0) {
          return [id, withoutParent(n)];
        }

        return [id, n];
      });

      while (queue.length > 0) {
        const current = queue.pop();
        const currentNode = state.nodes.get(current)!;
        removedNodes.add(current);
        for (const subexpField of semantics.subexpressions(currentNode)) {
          queue.push(currentNode.subexpressions[subexpField]);
        }
      }

      const oldNode = state.nodes.get(act.topNodeId)!;

      const newState = produce(state, draft => {
        for (const key of removedNodes) {
          // TODO iaa34: eliminate nodes that were removed by beta reduction in
          // this action. For now, this is currently handled by the stage for
          // animation reasons.

          // draft.nodes.delete(key);

          draft.board.delete(key);
          draft.toolbox.delete(key);
        }

        for (const [key, node] of addedNodes) {
          draft.nodes.set(key, node);
        }
        
        if (!oldNode.parent) {
          for (const newNodeId of act.newNodeIds) {
            draft.board.add(newNodeId);
          }
        } else {
          if (act.newNodeIds.length > 1) {
            console.error('Can\'t beta reduce nested lambda that produced multiple new nodes!');
            return;
          }

          const parent = draft.nodes.get(oldNode.parent)!;
          parent.subexpressions[oldNode.parentField] = act.newNodeIds[0];
        }
      });

      act.newNodeIds.forEach((id) => markDirty(newState.nodes, id));

      return newState;
    }

    case ActionKind.AttachNotch: {
      const child = state.getIn(['nodes', act.childId]);
      if (child.parent) throw 'Dragging objects from one hole to another is unsupported.';

      return state.withMutations((s) => {
        // s.set("board", s.get("board").filter(n => n !== act.childId));
        s.set('toolbox', s.toolbox.filter((n) => n !== act.childId));
        s.set('nodes', s.nodes.withMutations((nodes) => {
          nodes.set(act.parentId, nodes.get(act.parentId).set(`notch${act.notchIdx}`, act.childId));
          nodes.set(act.childId, child.withMutations((c) => {
            c.set('parentField', `notch${act.notchIdx}`);
            c.set('parent', act.parentId);
            c.set('locked', false);
          }));
        }));

        // TODO: refactor
        const defn = semantics.definition.expressions[s.getIn(['nodes', act.parentId, 'type'])];
        if (defn && defn.notches[act.notchIdx]) {
          const notch = defn.notches[act.notchIdx];
          if (notch.onAttach) {
            notch.onAttach(semantics, s, act.parentId, act.childId);
          }
        }

        if (s.board.contains(act.childId)) {
          // Actually remove from the board
          s.set('board', s.board.filter((n) => n !== act.childId));
        }

        const nodes = state.nodes;
        for (const id of state.board.concat(state.toolbox)) {
          markDirty(nodes, id);
        }
      });
    }

    case ActionKind.UseToolbox: {
      if (state.toolbox.has(act.nodeId)) {
        // If node has __meta indicating infinite uses, clone
        // instead.
        if (act.clonedNodeId) {
          return produce(state, draft => {
            for (const node of act.addedNodes) {
              draft.nodes.set(node.id, node);
            }

            draft.board.add(act.clonedNodeId);
          });
        }

        return produce(state, draft => {
          draft.board.add(act.nodeId);
          draft.toolbox.delete(act.nodeId);
        });
      }

      return state;
    }

    case ActionKind.Detach: {
      const node = state.nodes.get(act.nodeId)!;

      const parentId = node.parent;
      if (parentId === undefined) throw `Can't detach node ${act.nodeId} with no parent!`;

      return produce(state, (draft) => {
        draft.board.add(act.nodeId);
        const node = draft.nodes.get(act.nodeId)!;
        const parent = draft.nodes.get(parentId)!;
        const oldHole = parent.__meta?.slots[node.parentField!];
        if (oldHole) {
          parent.subexpressions[node.parentField] = oldHole;
          delete parent.__meta!.slots![`${node.parentField}:hole`];
        } else if (node.parentField.startsWith('notch')) {
          parent.subexpressions[node.parentField] = null;
        } else {
          throw 'Unimplemented: creating new hole';
        }

        // TODO: refactor
        if (node.parentField.startsWith('notch')) {
          const notchIdx = parseInt(node.parentField.slice(5), 10);
          const defn = semantics.definition.expressions[parent.type];
          if (defn && defn.notches[notchIdx]) {
            const notch = defn.notches[notchIdx];
            if (notch.onDetach) {
              notch.onDetach(semantics, draft, parent.id, node.id);
            }
          }

          for (const id of [...state.board, ...state.toolbox]) {
            markDirty(draft.nodes, id);
          }
        }

        node.parentField = null;
        node.parent = null;

        markDirty(draft.nodes, parentId);
      });
    }

    case ActionKind.Victory: {
      return produce(state, draft => {
        draft.board.clear();
        draft.goal.clear();
      });
    }

    case ActionKind.Unfade: {
      return produce(state, (draft) => {
        for (const newNode of act.addedNodes) {
          draft.nodes.set(newNode.id, newNode);
        }

        draft[act.source].delete(act.nodeId);
        draft[act.source].add(act.newNodeId);
      });
    }

    case ActionKind.Fade: {
      return produce(state, draft => {
        draft[act.source].delete(act.unfadedId);
        draft[act.source].add(act.fadedId);
      });

      // return state.withMutations((s) => {
      //   s.set(
      //     act.source,
      //     s.get(act.source).map((n) => (n === act.unfadedId ? act.fadedId : n))
      //   );
      // });
    }

    default: return state;
    }
  }

  function annotateTypes(state = initialProgram) {
    return produce(state, draft => {
      for (const id of dirty.values()) {
        const { types, completeness } = semantics.collectTypes(draft, draft.nodes.get(id));
        for (const [exprId, expr] of draft.nodes.entries()) {
          if (types.has(exprId)) {
            expr.ty = types.get(exprId);
          }
          if (completeness.has(exprId)) {
            expr.complete = completeness.get(exprId);
          }
        }
      }
      dirty = new Set();
    });
  }

  return {
    reducer: combineReducers<GlobalState>({
      program: undoable(compose(annotateTypes, program), {
        actionFilter: (act) => act.type === ActionKind.Raise
                    || act.type === ActionKind.Hover
                    // Prevent people from undoing start of level
                    || act.type === ActionKind.StartLevel
                    || act.type === ActionKind.Cleanup
                    || act.type === ActionKind.DetectCompletion
                    || act.skipUndo,
        extraState: (state, newState) => {
          const result = {};
          for (const id of state.board) {
            if (views[id]) {
              const pos = { ...gfx.absolutePos(views[id]) };
              if (pos.x === 0 && pos.y === 0) continue;
              result[id] = pos;
            }
          }
          for (const id of newState.board) {
            if (views[id]) {
              const pos = { ...gfx.absolutePos(views[id]) };
              if (pos.x === 0 && pos.y === 0) continue;
              result[id] = pos;
            }
          }
          return result;
        },
        restoreExtraState: (state, oldState, extraState) => {
          if (!extraState) return;

          for (const id of state.board) {
            if (!oldState.board.has(id)) {
              if (extraState[id]) {
                Object.assign(views[id].pos, gfx.absolutePos(views[id]));
                views[id].anchor.x = 0;
                views[id].anchor.y = 0;
                views[id].scale.x = 1.0;
                views[id].scale.y = 1.0;
                animate.tween(views[id].pos, restorePos(id, extraState[id]), {
                  duration: 250,
                  easing: animate.Easing.Cubic.Out
                });
              }
            }
          }
          for (const id of state.toolbox) {
            if (!oldState.toolbox.has(id)) {
              views[id].pos = gfx.absolutePos(views[id]);
              views[id].scale.x = 1.0;
              views[id].scale.y = 1.0;
            }
          }
        }
      })
    })
  };
}
