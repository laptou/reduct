import { produce, castDraft } from 'immer';

import { BaseNode, NodeMap } from '..';
import {
  createApplyNode, createArrayNode, createNumberNode, createPtupleNode,
} from '../util';

import { BuiltInError, WrongBuiltInParamsCountError, WrongTypeError } from '@/store/errors';
import { GameState } from '@/store/state';
import {
  DeepReadonly, DRF, withChild, withParent,
} from '@/util/helper';
import { cloneNodeDeep, CloneResult, mapNodeDeep } from '@/util/nodes';

type BuiltinFn = (
  self: DRF<BuiltInIdentifierNode>,
  args: DRF[],
  state: DeepReadonly<GameState>
) => DeepReadonly<GameState>;

/**
 * Helper function that will construct a new game state with cloned nodes added.
 *
 * @param self The builtin identifier node which was called.
 * @param cloneResult The result of calling cloneNodesDeep or mapNodesDeep.
 * @param state The current game state.
 * @returns A new game state where the cloned/mapped nodes have been added to
 * the game.
 */
function addClonedNodes(
  self: DRF,
  [clonedRoot, , newNodeMap]: CloneResult,
  state: DeepReadonly<GameState>
): DeepReadonly<GameState> {
  const added = new Map();

  if (self.parent && self.parentField) {
    if (self.parent !== clonedRoot.parent || self.parentField !== clonedRoot.parentField) {
      clonedRoot = withParent(clonedRoot, self.parent, self.parentField);

      let parent = state.nodes.get(clonedRoot.parent!)!;
      parent = withChild(parent, clonedRoot.id, self.parentField);

      newNodeMap = new Map([
        ...newNodeMap,
        [clonedRoot.id, clonedRoot],
        [parent.id, parent],
      ]);
    }
  }

  added.set(clonedRoot.id, self.id);

  return {
    ...state,
    added,
    nodes: newNodeMap,
  };
}

function builtinLength(
  self: DRF<BuiltInIdentifierNode>,
  args: DRF[],
  state: DeepReadonly<GameState>
): DeepReadonly<GameState> {
  if (args.length !== 1)
    throw new WrongBuiltInParamsCountError(self.id, 1, args.length);

  const arrayOrString = args[0];

  switch (arrayOrString.type) {
  case 'array': {
    const result = createNumberNode(arrayOrString.fields.length);

    return addClonedNodes(
      self,
      [
        result,
        [],
        new Map([...state.nodes, [result.id, result]]),
      ],
      state
    );
  }

  case 'string': {
    const result = createNumberNode(arrayOrString.fields.value.length);

    return addClonedNodes(
      self,
      [
        result,
        [],
        new Map([...state.nodes, [result.id, result]]),
      ],
      state
    );
  }

  default:
    throw new WrongTypeError(
      arrayOrString.id,
      ['array', 'string'],
      arrayOrString.type
    );
  }
}

function builtinGet(
  self: DRF<BuiltInIdentifierNode>,
  args: DRF[],
  state: DeepReadonly<GameState>
): DeepReadonly<GameState> {
  if (args.length !== 2)
    throw new WrongBuiltInParamsCountError(self.id, 2, args.length);

  const arrayNode = args[0];
  const indexNode = args[1];

  if (arrayNode.type !== 'array')
    throw new WrongTypeError(arrayNode.id, 'array', arrayNode.type);

  if (indexNode.type !== 'number')
    throw new WrongTypeError(indexNode.id, 'number', indexNode.type);

  const index = indexNode.fields.value;
  const length = arrayNode.fields.length;

  if (index >= length)
    throw new BuiltInError(indexNode.id, `You tried to get item ${index} of an array with only ${length} items`);

  const result = cloneNodeDeep(arrayNode.subexpressions[index], state.nodes);
  return addClonedNodes(self, result, state);
}

function builtinSet(
  self: DRF<BuiltInIdentifierNode>,
  args: DRF[],
  state: DeepReadonly<GameState>
): DeepReadonly<GameState> {
  if (args.length !== 3)
    throw new WrongBuiltInParamsCountError(self.id, 3, args.length);

  const arr = args[0];
  const index = args[1];
  const value = args[2];

  if (arr.type !== 'array')
    throw new WrongTypeError(arr.id, 'array', arr.type);

  if (index.type !== 'number')
    throw new WrongTypeError(index.id, 'number', index.type);

  const indexValue = index.fields.value;

  if (indexValue >= arr.fields.length)
    throw new BuiltInError(self.id, `You tried to set item ${indexValue} of an array with only ${arr.fields.length} items`);

  const nodeToReplace = arr.subexpressions[indexValue];

  return addClonedNodes(
    self,
    mapNodeDeep(
      arr.subexpressions[indexValue],
      nodes,
      (node, nodeMap) => {
        if (node.id === nodeToReplace) {
          const [valueClone, , newNodeMap] = cloneNodeDeep(value.id, nodeMap);
          return [valueClone, newNodeMap];
        }

        return [node, nodeMap];
      }
    ),
    state
  );
}

function builtinConcat(
  self: DRF<BuiltInIdentifierNode>,
  args: DRF[],
  state: DeepReadonly<GameState>
): DeepReadonly<GameState> {
  if (args.length !== 2)
    throw new WrongBuiltInParamsCountError(self.id, 2, args.length);

  const [left, right] = args;

  if (left.type !== 'array')
    throw new WrongTypeError(left.id, 'array', left.type);

  if (right.type !== 'array')
    throw new WrongTypeError(right.id, 'array', right.type);

  return produce(state, draft => {
    const newArr = createArrayNode();
    newArr.fields.length = left.fields.length + right.fields.length;
    newArr.parent = self.parent;
    newArr.parentField = self.parentField;

    draft.nodes.set(newArr.id, newArr);
    draft.added.set(newArr.id, self.id);

    let i = 0;

    for (let j = 0; j < left.fields.length; j++) {
      let [childClone, , newNodeMap] =
        cloneNodeDeep(left.subexpressions[j], draft.nodes);

      childClone = withParent(childClone, newArr.id, i.toString(10));
      draft.nodes = castDraft(newNodeMap);

      newArr.subexpressions[i] = childClone.id;
      i++;
    }

    for (let k = 0; k < right.fields.length; k++) {
      let [childClone, , newNodeMap] =
        cloneNodeDeep(right.subexpressions[k], draft.nodes);

      childClone = withParent(childClone, newArr.id, i.toString(10));
      draft.nodes = castDraft(newNodeMap);

      newArr.subexpressions[i] = childClone.id;
      i++;
    }
  });
}

function builtinMap(
  self: DRF<BuiltInIdentifierNode>,
  args: DRF[],
  state: DeepReadonly<GameState>
): DeepReadonly<GameState> {
  if (args.length !== 2)
    throw new WrongBuiltInParamsCountError(self.id, 2, args.length);

  const arr = args[0];
  const fn = args[1];

  if (arr.type !== 'array')
    throw new WrongTypeError(arr.id, 'array', arr.type);

  if (fn.type !== 'lambda' && fn.type !== 'builtin')
    throw new WrongTypeError(fn.id, ['lambda', 'builtin'], fn.type);

  // create an apply node for each item in the array

  let newNodeMap: DeepReadonly<NodeMap> = state.nodes;
  const applyNodes: DRF[] = [];
  const ptupleNodes: DRF[] = [];
  const newNodes: DRF[] = [];
  const newArr = createArrayNode();
  newArr.fields.length = arr.fields.length;

  for (const [index, itemId] of Object.entries(arr.subexpressions)) {
    const [clonedFn, clonedFnChildren, nodeMapWithClone] = cloneNodeDeep(fn.id, newNodeMap);
    const ptupleNode = createPtupleNode(itemId);
    const applyNode = createApplyNode(clonedFn.id, ptupleNode.id);

    ptupleNode.parent = applyNode.id;
    ptupleNode.parentField = 'callee';
    applyNode.parent = newArr.id;
    applyNode.parentField = index;
    newArr.subexpressions[index] = applyNode.id;

    newNodes.push(clonedFn, ...clonedFnChildren, ptupleNode, applyNode);
    ptupleNodes.push(ptupleNode);
    applyNodes.push(applyNode);
    newNodeMap = nodeMapWithClone;
  }

  newNodeMap = new Map([
    ...newNodeMap,
    ...applyNodes.map(applyNode => [applyNode.id, applyNode] as const),
    ...ptupleNodes.map(ptupleNode => [ptupleNode.id, ptupleNode] as const),
    [newArr.id, newArr],
  ]);

  return addClonedNodes(
    self,
    [newArr, newNodes, newNodeMap],
    state
  );
}

function builtinSlice(
  self: DRF<BuiltInIdentifierNode>,
  args: DRF[],
  state: DeepReadonly<GameState>
): DeepReadonly<GameState> {
  if (args.length !== 3)
    throw new WrongBuiltInParamsCountError(self.id, 2, args.length);

  const arrayNode = args[0];
  const indexStartNode = args[1];
  const indexEndNode = args[2];

  if (arrayNode.type !== 'array')
    throw new WrongTypeError(arrayNode.id, 'array', arrayNode.type);

  if (indexStartNode.type !== 'number')
    throw new WrongTypeError(indexStartNode.id, 'number', indexStartNode.type);

  if (indexEndNode.type !== 'number')
    throw new WrongTypeError(indexEndNode.id, 'number', indexStartNode.type);

  const indexStart = indexStartNode.fields.value;
  const indexEnd = indexEndNode.fields.value;
  const length = arrayNode.fields.length;

  if (indexStart >= length)
    throw new BuiltInError(indexStartNode.id, `You tried to get item ${indexStart} of an array with only ${length} items`);

  if (indexEnd > length)
    throw new BuiltInError(indexEndNode.id, `You tried to get item ${indexEnd - 1} of an array with only ${length} items`);

  const clonedNodes: DRF[] = [];
  let currentNodeMap = state.nodes;

  for (let i = indexStart; i < indexEnd; i++) {
    const [clone, descendants, newNodeMap] = cloneNodeDeep(
      arrayNode.subexpressions[i],
      currentNodeMap
    );

    clonedNodes.push(clone, ...descendants);
    currentNodeMap = newNodeMap;
  }

  const newArrayNode = createArrayNode(...clonedNodes.map(n => n.id));
  currentNodeMap = new Map([...currentNodeMap, [newArrayNode.id, newArrayNode]]);

  return addClonedNodes(
    self,
    [newArrayNode, clonedNodes, currentNodeMap],
    state
  );
}

export const builtins: Record<string, BuiltinFn> = {
  length: builtinLength,
  get: builtinGet,
  set: builtinSet,
  map: builtinMap,
  slice: builtinSlice,
  concat: builtinConcat,
  // fold: builtinFold,
};

/**
 * Represents an identifier for a function or object that is built into the game
 * (not defined using nodes.) Used to implement functions like set().
 */
export interface BuiltInIdentifierNode extends BaseNode {
  type: 'builtin';
  fields: { name: string };
}
