import { castDraft, produce } from 'immer';

import {
  ActionKind, createDetach, createEvalApply, createEvalConditional, createEvalIdentifier, createEvalLambda, createEvalLet, createEvalNot, createEvalOperator, createMoveNodeToBoard, createStep, ReductAction, createReturn,
} from '../action/game';
import {
  CircularCallError, GameError, MissingNodeError, NotOnBoardError, UnknownNameError, WrongTypeError, InvalidActionError,
} from '../errors';
import { GameMode, GameState } from '../state';

import type { Flat, NodeId, NodeMap } from '@/semantics';
import {
  ApplyNode, BinOpNode, BoolNode, ConditionalNode, IdentifierNode as IdentifierNode, LambdaArgNode, LambdaNode, LetNode, NotNode, NumberNode, OpNode, PTupleNode, StrNode,
} from '@/semantics/defs';
import { builtins } from '@/semantics/defs/builtins';
import {
  createBoolNode, createMissingNode, createNumberNode, createStrNode, getDefinitionForName, getKindForNode, getReductionOrderForNode, getValueForName, createReferenceNode,
} from '@/semantics/util';
import {
  DeepReadonly, DRF, mapIterable, withoutParent, withParent,
} from '@/util/helper';
import {
  cloneNodeAndAddDeep, findNodesDeep, getRootForNode, isAncestorOf,
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
  returned: null,
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
      returned: null,
    };
  }

  case ActionKind.GoToCredits: {
    return {
      ...state,
      mode: GameMode.Credits,
    };
  }

  case ActionKind.GoToGameplay: {
    return {
      ...state,
      mode: GameMode.Gameplay,
    };
  }

  case ActionKind.GoToSurvey: {
    return {
      ...state,
      mode: GameMode.Survey,
    };
  }

  case ActionKind.EvalLet: {
    const { letNodeId } = act;

    const letNode = state.nodes.get(letNodeId) as DRF<LetNode>;
    const identNode = state.nodes.get(letNode.subexpressions.variable) as DRF;
    const valueNode = state.nodes.get(letNode.subexpressions.value) as DRF;
    const bodyNode = state.nodes.get(letNode.subexpressions.body) as DRF;
    // place the reference node in the scope record of letnode with a value of e1

    if (!state.board.has(getRootForNode(letNodeId, state.nodes).id))
      throw new NotOnBoardError(letNodeId);

    if (identNode.type === 'missing')
      throw new MissingNodeError(identNode.id);

    if (identNode.type !== 'identifier')
      throw new WrongTypeError(identNode.id, 'identifier', identNode.type);

    if (valueNode.type === 'missing')
      throw new MissingNodeError(valueNode.id);

    if (bodyNode.type === 'missing')
      throw new MissingNodeError(bodyNode.id);

    return produce(state, draft => {
      draft.board.delete(letNode.id);

      draft.nodes.delete(letNode.id);
      draft.nodes.delete(identNode.id);

      draft.returned = bodyNode.id;
    });
  }

  case ActionKind.Call: {
    const { targetNodeId, paramNodeId } = act;
    state = gameReducer(state, createEvalLambda(targetNodeId, paramNodeId));
    state = gameReducer(state, createReturn(targetNodeId));
    return state;
  }

  case ActionKind.EvalLambda: {
    let { lambdaNodeId, paramNodeId } = act;

    if (!state.board.has(getRootForNode(lambdaNodeId, state.nodes).id))
      throw new NotOnBoardError(lambdaNodeId);

    if (lambdaNodeId === paramNodeId || isAncestorOf(paramNodeId, lambdaNodeId, state.nodes))
      throw new CircularCallError(lambdaNodeId);

    const lambdaNode = state.nodes.get(lambdaNodeId) as DRF<LambdaNode>;
    const paramNode = state.nodes.get(paramNodeId) as DRF;

    const paramNodeKind = getKindForNode(paramNode, state.nodes);

    if (paramNodeKind === 'syntax' || paramNodeKind === 'statement')
      throw new InvalidActionError(paramNodeId);

    const bodyNodeId = lambdaNode.subexpressions.body;

    if (state.nodes.get(bodyNodeId)!.type === 'missing')
      throw new MissingNodeError(bodyNodeId);

    // use the first unbound argument
    const argTuple = state.nodes.get(lambdaNode.subexpressions.arg) as DRF<PTupleNode>;
    if (0 in argTuple.subexpressions) {
      const argNodeId = argTuple.subexpressions[0];

      // force references to be reduced before being used as params
      if (paramNode.type === 'identifier') {
        state = gameReducer(state, createMoveNodeToBoard(paramNodeId));
        state = gameReducer(state, createEvalIdentifier(paramNodeId));
        paramNodeId = state.returned!;
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
        (nodeToMatch) =>
          nodeToMatch.type === 'identifier'
          && nodeToMatch.fields.name === argName
      );

      for (const referenceNode of referenceNodes) {
        // evaluate references which point to the arg
        const targetNodeId = getDefinitionForName(argName, referenceNode, state);
        if (targetNodeId !== argNodeId) continue;

        // keep track of which nodes are destroyed
        state = gameReducer(state, createStep(referenceNode.id));
      }

      // get param node and descendants
      const paramNodeDescendants = findNodesDeep(paramNodeId, state.nodes, () => true);

      return produce(state, draft => {
        const lambdaNodeMut = draft.nodes.get(lambdaNodeId) as Flat<LambdaNode>;

        const argTupleMut = draft.nodes.get(lambdaNodeMut.subexpressions.arg) as Flat<PTupleNode>;

        // move all of the args down
        draft.removed.set(argTupleMut.subexpressions[0], false);

        for (let i = 1; i < argTupleMut.fields.size; i++) {
          argTupleMut.subexpressions[i - 1] = argTupleMut.subexpressions[i];
        }

        argTupleMut.fields.size--;

        // param node should be consumed from board or toolbox
        draft.board.delete(paramNodeId);
        draft.toolbox.delete(paramNodeId);

        // param node and descendants are no longer needed, eliminate them
        for (const paramNodeDescendant of paramNodeDescendants) {
          draft.removed.set(paramNodeDescendant.id, false);
        }

        if (argTupleMut.fields.size === 0) {
          draft.returned = lambdaNodeMut.subexpressions.body;
        } else {
          draft.returned = lambdaNodeMut.id;
        }
      });
    } else {
      throw new InvalidActionError(lambdaNode.id);
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

      // cast b/c we have already verified that these are the same type
      resultValue = (leftValue as number) + (rightValue as number);
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

      draft.added.set(resultNode.id, binOpNode.id);

      draft.returned = resultNode.id;
      draft.nodes.set(resultNode.id, resultNode as DRF);

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

    const resultNode = condNode.fields.value ? positiveNode : negativeNode;
    const removedNode = !condNode.fields.value ? positiveNode : negativeNode;

    return produce(state, draft => {
      draft.board.delete(blockNode.id);
      draft.board.delete(condNode.id);

      draft.added.set(resultNode.id, blockNode.id);

      draft.returned = resultNode.id;
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

    const resultNode = createBoolNode(!valueNode.fields.value);

    return produce(state, draft => {
      draft.board.delete(notNode.id);

      draft.added.set(resultNode.id, notNode.id);
      draft.returned = resultNode.id;

      draft.nodes.set(resultNode.id, resultNode as DRF);

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

    if (calleeNode.type === 'builtin') {
      const builtin = builtins[calleeNode.fields.name];
      state = builtin(calleeNode, paramNodes, state);
    } else if (calleeNode.type === 'lambda') {
      let paramIdx = 0;

      while (paramIdx < paramNodes.length) {
        const paramNode = paramNodes[paramIdx];
        state = gameReducer(state, createEvalLambda(calleeNode.id, paramNode.id));
        paramIdx++;
      }
    } else {
      throw new WrongTypeError(calleeNode.id, ['lambda', 'builtin'], calleeNode.type);
    }

    const resultNodeId = state.returned;

    return produce(state, draft => {
      draft.board.delete(applyNode.id);

      // set the source of the nodes to the application node instead of the
      // lambda node
      for (const [addedNode, sourceNode] of draft.added) {
        if (sourceNode === calleeNode.id) {
          draft.added.set(addedNode, applyNode.id);
        }
      }

      draft.returned = resultNodeId;

      // schedule for cleanup
      draft.removed.set(applyNode.id, false);
    });
  }

  case ActionKind.EvalIdentifier: {
    const { identifierNodeId: referenceNodeId } = act;

    if (!state.board.has(getRootForNode(referenceNodeId, state.nodes).id))
      throw new NotOnBoardError(referenceNodeId);

    const identNode = state.nodes.get(referenceNodeId) as DRF<IdentifierNode>;
    const targetId = getValueForName(identNode.fields.name, identNode, state);

    if (targetId === undefined || targetId === null)
      throw new UnknownNameError(identNode.id, identNode.fields.name);

    const targetNode = state.nodes.get(targetId)!;

    if (targetNode.type === 'missing')
      throw new MissingNodeError(targetId);

    let resultNode: DRF, newNodeMap: NodeMap;

    switch (targetNode.type) {
    case 'array': {
      // array is special b/c it is a reference type
      // currently, no other reference types are in the game

      resultNode = createReferenceNode(targetId) as DRF;
      newNodeMap = new Map([
        ...state.nodes,
        [resultNode.id, resultNode],
      ]);
      break;
    }
    default: {
      [resultNode, , newNodeMap] =
        cloneNodeAndAddDeep(targetId, state.nodes);
      break;
    }
    }

    return {
      ...state,
      nodes: newNodeMap,
      returned: resultNode.id,
    };
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
          const [clonedNode, clonedDescendants, newNodeMap] = cloneNodeAndAddDeep(act.nodeId, state.nodes);

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

      const childKind = getKindForNode(child, draft.nodes);

      if (childKind === 'syntax' || childKind === 'statement')
        throw new InvalidActionError(child.id);

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
    const parallel = targetNode.type === 'ptuple';

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
      state = gameReducer(state, createEvalLet(targetNode.id));
      break;
    case 'apply':
      state = gameReducer(state, createEvalApply(targetNode.id));
      break;
    case 'binop':
      state = gameReducer(state, createEvalOperator(targetNode.id));
      break;
    case 'conditional':
      state = gameReducer(state, createEvalConditional(targetNode.id));
      break;
    case 'not':
      state = gameReducer(state, createEvalNot(targetNode.id));
      break;
    case 'identifier':
      state = gameReducer(state, createEvalIdentifier(targetNode.id));
      break;
    default:
      throw new Error(`Cannot step a ${targetNode.type}`);
    }

    return gameReducer(state, createReturn(targetNodeId));
  }

  case ActionKind.Return: {
    const { targetNodeId } = act;

    if (state.returned === null || state.returned === targetNodeId)
      return state;

    const targetNode = state.nodes.get(targetNodeId)!;

    return produce(state, draft => {
      draft.added.clear();
      draft.removed.set(targetNodeId, false);
      draft.board.delete(targetNodeId);
      draft.toolbox.delete(targetNodeId);

      const returnedNode = draft.nodes.get(draft.returned!)!;

      // replace the target node with the returned node
      if (targetNode.parent) {
        const parent = draft.nodes.get(targetNode.parent)!;
        const parentField = targetNode.parentField!;

        returnedNode.parent = parent.id;
        returnedNode.parentField = parentField;
        parent.subexpressions[parentField] = returnedNode.id;
      } else {
        // if there is no parent, then this node goes on the board
        returnedNode.parent = null;
        returnedNode.parentField = null;

        if (returnedNode.type === 'vtuple') {
          for (const subExprId of Object.values(returnedNode.subexpressions)) {
            const subExpr = draft.nodes.get(subExprId)!;
            subExpr.parent = null;
            subExpr.parentField = null;
            draft.board.add(subExprId);
            draft.added.set(subExprId, targetNode.id);
          }
        } else {
          draft.board.add(returnedNode.id);
          draft.added.set(returnedNode.id, targetNode.id);
        }
      }
    });
  }

  case ActionKind.Execute: {
    const { targetNodeId } = act;

    const targetNode = state.nodes.get(targetNodeId)!;

    if (getKindForNode(targetNode, state.nodes) !== 'expression')
      return state;

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

    // if it was replaced by other nodes or is no longer steppable, add those to
    // the execution list
    if (state.removed.has(targetNodeId)
    || getKindForNode(targetNode, state.nodes) !== 'expression')
      executing.delete(targetNodeId);

    for (const [nodeId, sourceId] of state.added) {
      if (sourceId !== targetNodeId)
        continue;

      const newNode = state.nodes.get(nodeId)!;

      if (getKindForNode(newNode, state.nodes) !== 'expression')
        continue;

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

  case ActionKind.Raise: {
    const root = getRootForNode(act.nodeId, state.nodes);

    if (state.board.has(root.id)) {
      return produce(state, draft => {
        draft.board.delete(root.id);
        draft.board.add(root.id);

        // clear added dictionary so that
        // board does not reset
        draft.added.clear();
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
      const oldHole = parent.__meta?.slots?.[node.parentField];

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

  default: return state;
  }
}
