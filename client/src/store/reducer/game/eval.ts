import { castDraft, produce } from 'immer';
import * as Sentry from '@sentry/react';

import {
  ActionKind, createEvalApply, createEvalConditional, createEvalIdentifier, createEvalLambda, createEvalLet, createEvalNot, createEvalOperator, createMoveNodeToBoard, createReturn, createStep, ReductAction,
} from '../../action/game';
import {
  CircularCallError, GameError, InvalidActionError, MissingNodeError, NotOnBoardError, UnknownNameError, WrongTypeError,
} from '../../errors';
import { GameState } from '../../state';

import type { Flat, NodeMap } from '@/semantics';
import {
  ApplyNode, BinOpNode, BoolNode, ConditionalNode, IdentifierNode as IdentifierNode, LambdaArgNode, LambdaNode, LetNode, NotNode, NumberNode, OpNode, PTupleNode, StrNode,
} from '@/semantics/defs';
import { builtins } from '@/semantics/defs/builtins';
import {
  createBoolNode, createNumberNode, createReferenceNode, createStrNode, getDefinitionForName, getKindForNode, getReductionOrderForNode, getValueForName,
} from '@/semantics/util';
import { DeepReadonly, DRF } from '@/util/helper';
import {
  cloneNodeAndAddDeep, findNodesDeep, getRootForNode, isAncestorOf,
} from '@/util/nodes';

export function gameEvalReducer(
  state: DeepReadonly<GameState>,
  act?: ReductAction
): DeepReadonly<GameState> {
  if (!act) return state;

  switch (act.type) {
  case ActionKind.Call: {
    const { targetNodeId, paramNodeId } = act;
    state = gameEvalReducer(state, createEvalLambda(targetNodeId, paramNodeId));
    state = gameEvalReducer(state, createReturn(targetNodeId));
    return state;
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
      draft.removed.set(identNode.id, false);

      draft.returned = [bodyNode.id];
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
        state = gameEvalReducer(state, createMoveNodeToBoard(paramNodeId));
        state = gameEvalReducer(state, createEvalIdentifier(paramNodeId));
        paramNodeId = state.returned[0];
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
        state = gameEvalReducer(state, createStep(referenceNode.id));
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
          draft.returned = [lambdaNodeMut.subexpressions.body];
        } else {
          draft.returned = [lambdaNodeMut.id];
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
      draft.added.set(resultNode.id, binOpNode.id);

      draft.returned = [resultNode.id];
      draft.nodes.set(resultNode.id, resultNode as DRF);

      // schedule for cleanup
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

    if (condNode.type === 'missing')
      throw new MissingNodeError(condNode.id);

    if (condNode.type !== 'boolean')
      throw new WrongTypeError(condNode.id, ['boolean'], condNode.type);

    if (negativeNode.type === 'missing')
      throw new MissingNodeError(negativeNode.id);

    if (positiveNode.type === 'missing')
      throw new MissingNodeError(positiveNode.id);

    const resultNode = condNode.fields.value ? positiveNode : negativeNode;
    const removedNode = !condNode.fields.value ? positiveNode : negativeNode;

    return produce(state, draft => {
      draft.board.delete(condNode.id);

      draft.added.set(resultNode.id, blockNode.id);

      draft.returned = [resultNode.id];
      draft.nodes.set(resultNode.id, castDraft(resultNode));

      // schedule for cleanup
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
      draft.added.set(resultNode.id, notNode.id);
      draft.returned = [resultNode.id];

      draft.nodes.set(resultNode.id, resultNode as DRF);
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
        state = gameEvalReducer(state, createEvalLambda(calleeNode.id, paramNode.id));
        paramIdx++;
      }
    } else {
      throw new WrongTypeError(calleeNode.id, ['lambda', 'builtin'], calleeNode.type);
    }

    const resultNodeId = state.returned[0];

    return produce(state, draft => {
      draft.board.delete(applyNode.id);

      // set the source of the nodes to the application node instead of the
      // lambda node
      for (const [addedNode, sourceNode] of draft.added) {
        if (sourceNode === calleeNode.id) {
          draft.added.set(addedNode, applyNode.id);
        }
      }

      draft.returned = [resultNodeId];

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
      returned: [resultNode.id],
    };
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
        state = gameEvalReducer(state, createStep(childId));
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
      state = gameEvalReducer(state, createEvalLet(targetNode.id));
      break;
    case 'apply':
      state = gameEvalReducer(state, createEvalApply(targetNode.id));
      break;
    case 'binop':
      state = gameEvalReducer(state, createEvalOperator(targetNode.id));
      break;
    case 'conditional':
      state = gameEvalReducer(state, createEvalConditional(targetNode.id));
      break;
    case 'not':
      state = gameEvalReducer(state, createEvalNot(targetNode.id));
      break;
    case 'identifier':
      state = gameEvalReducer(state, createEvalIdentifier(targetNode.id));
      break;
    default:
      throw new Error(`Cannot step a ${targetNode.type}`);
    }

    if (state.error) {
      return state;
    }

    return gameEvalReducer(state, createReturn(targetNodeId));
  }

  case ActionKind.Return: {
    const { targetNodeId } = act;

    if (
      state.returned.length === 0
      || (state.returned.length === 1 && state.returned[0] === targetNodeId))
      return state;

    const targetNode = state.nodes.get(targetNodeId)!;

    // set if executing a return on the target node causes more nodes to be
    // returned
    const cascade = new Map();

    state = produce(state, draft => {
      draft.added.clear();
      draft.removed.set(targetNodeId, false);
      draft.board.delete(targetNodeId);
      draft.toolbox.delete(targetNodeId);

      for (const returnedNodeId of draft.returned) {
        const returnedNode = draft.nodes.get(returnedNodeId)!;

        if (!returnedNode) {
          Sentry.captureEvent({
            level: Sentry.Severity.Warning,
            message: `returned node ${returnedNodeId} was not found; returned from ${targetNodeId} (${JSON.stringify(targetNode)})`,
          });
        }

        if (returnedNode.type === 'missing')
          throw new MissingNodeError(returnedNodeId);

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

          if (returnedNode.type === 'void') {
            // void nodes should not be added to anything
            // they should just disappear
            draft.removed.set(returnedNode.id, false);
          } else if (returnedNode.type === 'vtuple') {
            cascade.set(returnedNode.id, [...Object.values(returnedNode.subexpressions)]);
          } else {
            draft.board.add(returnedNode.id);
            draft.added.set(returnedNode.id, targetNode.id);
          }
        }
      }
    });

    for (const [targetId, newReturnNodeIds] of cascade) {
      state = gameEvalReducer(
        {
          ...state,
          returned: newReturnNodeIds,
        },
        createReturn(targetId)
      );
    }

    return state;
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
      state = gameEvalReducer(state, createStep(targetNodeId));
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

    const newTargetNode = state.nodes.get(targetNodeId)!;

    // if it was replaced by other nodes or is no longer steppable, add those to
    // the execution list
    if (state.removed.has(targetNodeId)
    || getKindForNode(newTargetNode, state.nodes) !== 'expression')
      executing.delete(targetNodeId);

    for (const nodeId of state.returned) {
      if (isAncestorOf(nodeId, targetNodeId, state.nodes))
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

  default: return state;
  }
}
