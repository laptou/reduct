import { castDraft, produce } from 'immer';

import {
  CircularCallError, GameError, MissingNodeError, NotOnBoardError, UnknownNameError, WrongTypeError, 
} from '../errors';
import { checkDefeat, checkVictory } from '../helper';
import { GameMode, GameState } from '../state';
import {
  ActionKind, createDetach, createEvalApply, createEvalConditional, createEvalLambda, createEvalNot, createEvalOperator, createEvalIdentifier, createMoveNodeToBoard, createStep, ReductAction, createEvalLet, 
} from '../action/game';

import type { Flat, NodeId, NodeMap } from '@/semantics';
import {
  ApplyNode, LetNode, BinOpNode, BoolNode, ConditionalNode, LambdaArgNode, LambdaNode, NotNode, NumberNode, OpNode, PTupleNode, IdentifierNode as IdentifierNode, StrNode,
} from '@/semantics/defs';
import { builtins } from '@/semantics/defs/builtins';
import {
  createBoolNode, createMissingNode, createNumberNode, createStrNode, getKindForNode, getValueForName, iterateTuple, getReductionOrderForNode,
} from '@/semantics/util';
import {
  DeepReadonly, DRF, mapIterable, withoutParent, withParent,
} from '@/util/helper';
import {
  cloneNodeDeep, findNodesDeep, getRootForNode, isAncestorOf,
} from '@/util/nodes';

const initialProgram: GameState = {
  mode: GameMode.Title,
  level: -1,
  nodes: new Map(),
  goal: new Set(),
  board: new Set(),
  toolbox: new Set(),
  globals: new Map(),
  docs: new Map(),
  added: new Map(),
  removed: new Map(),
  executing: new Set(),
};

// To speed up type checking, we only type check nodes that have
// changed.
const dirty = new Set<NodeId>();
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

export function gameReducer(
  state: DeepReadonly<GameState> = initialProgram, 
  act?: ReductAction
): DeepReadonly<GameState> {
  if (!act) return state;

  switch (act.type) {
  case ActionKind.StartLevel: {
    return {
      ...state,
      mode: GameMode.Gameplay,
      level: act.level,
      nodes: act.nodes,
      goal: act.goal,
      board: act.board,
      toolbox: act.toolbox,
      globals: act.globals,
      added: new Map(mapIterable(act.nodes.keys(), id => [id, null] as const)),
      removed: new Map(),
      executing: new Set(),
    };
  }

  case ActionKind.EvalLet: {
    const { letNodeId } = act;

    const letNode = state.nodes.get(letNodeId) as DRF<LetNode>;
    const refNode = state.nodes.get(letNode.subexpressions.variable) as DRF;
    const valueNode = state.nodes.get(letNode.subexpressions.value) as DRF;
    const bodyNode = state.nodes.get(letNode.subexpressions.body) as DRF;
    // place the reference node in the scope record of letnode with a value of e1
    //letnode.scope[refnode.fields.name] = state.nodes.get(letnode.subexpressions.e1)!.id;

    if (!state.board.has(getRootForNode(letNodeId, state.nodes).id))
      throw new NotOnBoardError(letNodeId);

    if (refNode.type === 'missing')
      throw new MissingNodeError(refNode.id);

    if (refNode.type !== 'identifier')
      throw new WrongTypeError(refNode.id, 'identifier', refNode.type);

    if (valueNode.type === 'missing')
      throw new MissingNodeError(valueNode.id);

    if (bodyNode.type === 'missing')
      throw new MissingNodeError(bodyNode.id);

    return produce(state, draft => {
      const bodyNodeMut = draft.nodes.get(letNode.subexpressions.body)!;

      if (!bodyNodeMut.scope) {
        bodyNodeMut.scope = {};
      }

      const varName = refNode.fields.name;
      bodyNodeMut.scope[varName] = valueNode.id;

      // update parent's reference to this node since we are replacing it with
      // its body
      if (letNode.parent) {
        const parent = draft.nodes.get(letNode.parent)!;
        const parentField = letNode.parentField;
        bodyNodeMut.parent = parent.id;
        bodyNodeMut.parentField = parentField;

        // @ts-ignore
        parent.subexpressions[parentField] = bodyNode.id;
        draft.added.set(bodyNode.id, letNode.id);
      } else {
        // if there is no parent, then this node was on the board
        bodyNodeMut.parent = null;
        bodyNodeMut.parentField = null;

        if (bodyNode.type === 'vtuple') {
          for (const subExprId of Object.values(bodyNode.subexpressions)) {
            const subExpr = draft.nodes.get(subExprId)!;
            subExpr.parent = null;
            subExpr.parentField = null;
            draft.board.add(subExprId);
            draft.added.set(subExprId, letNode.id);
          }
        } else {
          draft.board.add(bodyNode.id);
          draft.added.set(bodyNode.id, letNode.id);
        }
      }

      draft.board.delete(letNode.id);

      draft.nodes.delete(letNode.id);
      draft.nodes.delete(refNode.id);
    });
  }

  case ActionKind.EvalLambda: {
    let { lambdaNodeId, paramNodeId } = act;

    if (!state.board.has(getRootForNode(lambdaNodeId, state.nodes).id))
      throw new NotOnBoardError(lambdaNodeId);

    if (lambdaNodeId === paramNodeId || isAncestorOf(paramNodeId, lambdaNodeId, state.nodes))
      throw new CircularCallError(lambdaNodeId);

    const lambdaNode = state.nodes.get(lambdaNodeId) as DRF<LambdaNode>;
    const paramNode = state.nodes.get(paramNodeId) as DRF;

    const bodyNodeId = lambdaNode.subexpressions.body;

    if (state.nodes.get(bodyNodeId)!.type === 'missing')
      throw new MissingNodeError(bodyNodeId);

    const removed: Array<NodeId> = [];

    // use the first unbound argument
    const argTuple = state.nodes.get(lambdaNode.subexpressions.arg) as DRF<PTupleNode>;
    if (0 in argTuple.subexpressions) {
      const argNodeId = argTuple.subexpressions[0];

      // force references to be reduced before being used as params
      if (paramNode.type === 'identifier') {
        state = gameReducer(state, createMoveNodeToBoard(paramNodeId));
        state = gameReducer(state, createEvalIdentifier(paramNodeId));
        paramNodeId = [...state.added].find(([, source]) => source === paramNodeId)![0];
      }

      const argNode = state.nodes.get(argNodeId) as DRF<LambdaArgNode>;
      const argName = argNode.fields.name;

      // bind the param value to the arg node
      const boundArgNode = {
        ...argNode,
        fields: {
          ...argNode.fields,
          value: paramNodeId,
        },
      };
      const newNodeMap = new Map(state.nodes);
      newNodeMap.set(boundArgNode.id, boundArgNode);
      state = {
        ...state,
        nodes: newNodeMap,
      };

      // find all of the references who point to this arg
      const referenceNodes = findNodesDeep(
        bodyNodeId,
        state.nodes,
        (nodeToMatch) => nodeToMatch.type === 'identifier' && nodeToMatch.fields.name === argName,
        (nodeToFilter, nodeMap) => {
          // don't bother searching inside of nodes that redefine the name in
          // their own scope, such as lambdas with the same arg name
          if (nodeToFilter.type === 'lambda') {
            const argTuple = nodeMap.get(nodeToFilter.subexpressions.arg) as DRF<PTupleNode>;
            for (const nodeToFilterArg of iterateTuple<LambdaArgNode>(argTuple, nodeMap))
              if (nodeToFilterArg.fields.name === argName) return false;
          }

          return true;
        });


      // eval all relevant references and keep track of which nodes are destroyed
      for (const referenceNode of referenceNodes) {
        state = gameReducer(state, createEvalIdentifier(referenceNode.id));
        removed.push(...state.removed.keys());
      }

      // get param node and descendants
      const paramNodeDescendants = findNodesDeep(paramNodeId, state.nodes, () => true);

      return produce(state, draft => {
        // everything is immutable, we have a new state which means lambdaNode
        // points to old state
        const newLambdaNode = draft.nodes.get(lambdaNodeId) as Flat<LambdaNode>;

        draft.added = new Map();

        for (const id of removed)
          draft.removed.set(id, false);

        const newArgTuple = draft.nodes.get(newLambdaNode.subexpressions.arg) as Flat<PTupleNode>;

        const oldArgNodeId = newArgTuple.subexpressions[0] ?? null;

        // move all of the args down
        for (let i = 1; i < newArgTuple.fields.size; i++) {
          newArgTuple.subexpressions[i - 1] = newArgTuple.subexpressions[i];
        }

        newArgTuple.fields.size--;

        // param node should be consumed from board or toolbox
        draft.board.delete(paramNodeId);
        draft.toolbox.delete(paramNodeId);

        // param node and descendants are no longer needed, eliminate them
        for (const paramNodeDescendant of paramNodeDescendants) {
          draft.removed.set(paramNodeDescendant.id, false);
        }

        // move the body outwards if no more params
        if (newArgTuple.fields.size === 0) {
          const bodyNode = draft.nodes.get(newLambdaNode.subexpressions.body)!;

          if (newLambdaNode.parent) {
            bodyNode.parent = lambdaNode.parent;
            bodyNode.parentField = lambdaNode.parentField;

            const lambdaParent = draft.nodes.get(newLambdaNode.parent)!;
            (lambdaParent.subexpressions as Record<string, NodeId>)[newLambdaNode.parentField!] = bodyNode.id;
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

          // lambda node is no longer needed, eliminate it
          draft.board.delete(lambdaNode.id);

          // mark these nodes for cleanup
          draft.removed.set(lambdaNode.id, false);

          if (oldArgNodeId !== null)
            draft.removed.set(oldArgNodeId, false);
        }
      });
    }
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
        throw new WrongTypeError(leftNode.id, [
          'number', 'string', 'boolean', 'symbol',
        ], leftNode.type);

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
      draft.removed.set(binOpNode.id, false);
      draft.removed.set(opNode.id, false);
      draft.removed.set(leftNode.id, false);
      draft.removed.set(rightNode.id, false);
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

      draft.nodes.set(resultNode.id, castDraft(resultNode));

      // schedule for cleanup
      draft.removed.set(blockNode.id, false);
      draft.removed.set(condNode.id, false);
      draft.removed.set(removedNode.id, false);
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
      draft.removed.set(notNode.id, false);
    });
  }

  case ActionKind.EvalApply: {
    const { applyNodeId } = act;

    if (!state.board.has(getRootForNode(applyNodeId, state.nodes).id))
      throw new NotOnBoardError(applyNodeId);

    const applyNode = state.nodes.get(applyNodeId) as DRF<ApplyNode>;
    const paramTupleNode = state.nodes.get(applyNode.subexpressions.argument)! as DRF<PTupleNode>;
    const paramNodes: DRF[] = [];

    for (let i = 0; i < paramTupleNode.fields.size; i++) {
      const argNode = state.nodes.get(paramTupleNode.subexpressions[i])!;

      if (argNode.type === 'missing')
        throw new MissingNodeError(argNode.id);

      paramNodes.push(argNode);
    }

    const calleeNode = state.nodes.get(applyNode.subexpressions.callee)!;

    if (calleeNode.type === 'missing')
      throw new MissingNodeError(calleeNode.id);

    let resultNodeId: NodeId;

    if (calleeNode.type === 'builtin') {
      const builtin = builtins[calleeNode.fields.name as keyof typeof builtins];
      const [newNode, addedNodes, newNodeMap] = builtin.impl(calleeNode, paramNodes, state.nodes);
      state = {
        ...state,
        added: new Map([newNode, ...addedNodes].map(({ id }) => [id, calleeNode.id])),
        nodes: newNodeMap,
      };

      resultNodeId = newNode.id;
    } else if (calleeNode.type === 'lambda') {
      let paramIdx = 0;

      while (paramIdx < paramNodes.length) {
        const paramNode = paramNodes[paramIdx];
        state = gameReducer(state, createEvalLambda(calleeNode.id, paramNode.id));
        paramIdx++;
      }


      // there should only be one added node after evaluating the lambda, and it
      // should be the result of evaluating the lambda
      resultNodeId = [...state.added.keys()][0];
    } else {
      throw new WrongTypeError(calleeNode.id, ['lambda', 'builtin'], calleeNode.type);
    }

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
      draft.removed.set(applyNode.id, false);
    });
  }

  case ActionKind.EvalIdentifier: {
    const { identifierNodeId: referenceNodeId } = act;

    if (!state.board.has(getRootForNode(referenceNodeId, state.nodes).id))
      throw new NotOnBoardError(referenceNodeId);

    const referenceNode = state.nodes.get(referenceNodeId) as DRF<IdentifierNode>;
    const targetId = getValueForName(referenceNode.fields.name, referenceNode, state);

    if (targetId === undefined || targetId === null)
      throw new UnknownNameError(referenceNode.id, referenceNode.fields.name);

    if (state.nodes.get(targetId)!.type === 'missing')
      throw new MissingNodeError(targetId);

    const [clonedNode, , newNodeMap] =
        cloneNodeDeep(targetId, state.nodes);

    state = {
      ...state,
      nodes: newNodeMap,
    };

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
      draft.removed.set(referenceNode.id, false);
    });
  }

  case ActionKind.Cleanup: {
    const { target } = act;
    if (!state.removed.has(target)) return state;

    // if all of the nodes in the removed set have been marked as ready for
    // cleanup, delete them
    if ([...state.removed.values()].every(i => i)) {
      return produce(state, draft => {
        for (const removed of state.removed.keys()) {
          draft.nodes.delete(removed);
          draft.removed.delete(removed);
        }
      });
    } else {
      // otherwise, just mark as ready for cleanup
      return produce(state, draft => {
        draft.removed.set(target, true);
      });
    }
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
      return gameReducer(state, createDetach(node.id));
    }

    return state;
  }

  case ActionKind.MoveNodeToSlot: {
    const { slotId, nodeId } = act;

    state = gameReducer(state, createMoveNodeToBoard(nodeId));

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

    state = gameReducer(state, createMoveNodeToBoard(nodeId));

    if (defNode.type !== 'define')
      throw new WrongTypeError(nodeId, 'define', defNode.type);

    // search for any unfilled slots
    const [slot] = findNodesDeep(nodeId, state.nodes, (node) => node.type === 'missing');

    if (slot)
      throw new MissingNodeError(slot.id);

    return produce(state, draft => {
      draft.globals.set(defNode.fields.name, nodeId);
      draft.board.delete(nodeId);
    });
  }

  case ActionKind.Step: {
    const { targetNodeId } = act;

    const targetNode = state.nodes.get(targetNodeId)!;
    const targetNodeKind = getKindForNode(targetNode, state.nodes);

    if (targetNodeKind === 'placeholder') {
      throw new MissingNodeError(targetNodeId);
    }

    if (targetNodeKind !== 'expression') {
      // this should be impossible, the user can't step nodes that aren't
      // expressions but just in case
      throw new Error('This node is not an expression');
    }

    // for most nodes, we should evaluate children one at a time
    // but for tuples, we should evaluate children in parallel
    let stepped = false;
    const parallel = targetNode.type === 'vtuple' || targetNode.type === 'ptuple';

    for (const name of getReductionOrderForNode(targetNode)) {
      const childId = targetNode.subexpressions[name];
      const childNode = state.nodes.get(childId)!;
      const childNodeKind = getKindForNode(childNode, state.nodes);

      // this is a child node that needs further evaluation, return the result
      // of stepping it once
      if (childNodeKind === 'expression') {
        state = gameReducer(state, createStep(childId));
        stepped = true;

        if (!parallel)
          return state;
      }

      if (childNodeKind === 'placeholder')
        throw new MissingNodeError(childNode.id);
    }

    if (stepped)
      return state;

    // if we are here, all of the child nodes are fully stepped so we should
    // just step this node
    switch (targetNode.type) {
    case 'let':
      return gameReducer(state, createEvalLet(targetNode.id));
    case 'apply':
      return gameReducer(state, createEvalApply(targetNode.id));
    case 'binop':
      return gameReducer(state, createEvalOperator(targetNode.id));
    case 'conditional':
      return gameReducer(state, createEvalConditional(targetNode.id));
    case 'not':
      return gameReducer(state, createEvalNot(targetNode.id));
    case 'identifier':
      return gameReducer(state, createEvalIdentifier(targetNode.id));
    default:
      throw new Error(`Cannot step a ${targetNode.type}`);
    }
  }

  case ActionKind.Execute: {
    const { targetNodeId } = act;

    const executing = new Set(state.executing);
    executing.add(targetNodeId);

    try {
      // step the node
      state = gameReducer(state, createStep(targetNodeId));
    } catch (error) {
      // trap errors and stop execution
      if (error instanceof GameError) {
        executing.delete(targetNodeId);
        return {
          ...state,
          executing,
          error,
        };
      } else {
        throw error;
      }
    }

    // if it was replaced by other nodes, add those
    // to the execution list

    if (state.removed.has(targetNodeId))
      executing.delete(targetNodeId);

    for (const [nodeId, sourceId] of state.added) {
      if (sourceId !== targetNodeId) continue;

      const node = state.nodes.get(nodeId)!;

      if (getKindForNode(node, state.nodes) !== 'expression') continue;

      executing.add(nodeId);
    }

    return {
      ...state,
      executing,
    };
  }

  case ActionKind.Stop: {
    const { targetNodeId } = act;

    const executing = new Set(state.executing);
    executing.delete(targetNodeId);

    return {
      ...state,
      executing,
    };
  }

  case ActionKind.DetectCompletion: {
    if (checkVictory(state))
      return {
        ...state,
        mode: GameMode.Victory,
      };

    if (checkDefeat(state))
      return {
        ...state,
        mode: GameMode.Defeat,
      };

    return state;
  }

  case ActionKind.Raise: {
    const root = getRootForNode(act.nodeId, state.nodes);
    if (state.board.has(root.id)) {
      return produce(state, draft => {
        draft.board.delete(root.id);
        draft.board.add(root.id);
      });
    }

    return state;
  }
  
  case ActionKind.CreateDocNodes: {
    return {
      ...state,
      nodes: new Map([...state.nodes, ...act.nodes]),
      docs: new Map([...state.docs, [act.key, act.rootId]]),
    };
  }
  
  case ActionKind.DeleteDocNodes: {
    const rootId = state.docs.get(act.key)!;

    if (!state.nodes.has(rootId)) return state;

    const descendants = findNodesDeep(rootId, state.nodes, () => true);
  
    return produce(state, draft => {
      for (const descendant of descendants) {
        draft.nodes.delete(descendant.id);
      }
  
      draft.docs.delete(act.key);
    });
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
    if (!parentId) throw new Error(`Can't detach node ${act.nodeId} with no parent!`);

    return produce(state, (draft) => {
      draft.board.add(act.nodeId);
      const node = draft.nodes.get(act.nodeId)!;
      const parent = draft.nodes.get(parentId)!;
      const oldHole = parent.__meta?.slots?.[node.parentField!];

      if (oldHole) {
        parent.subexpressions[node.parentField] = oldHole;
        delete parent.__meta!.slots![`${node.parentField}:hole`];
      } else {
        const newSlot = createMissingNode();
        draft.nodes.set(newSlot.id, newSlot);
        newSlot.parent = parentId;
        newSlot.parentField = node.parentField;
        parent.subexpressions[node.parentField] = newSlot.id;
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
