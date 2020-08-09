import { BuiltInError, WrongBuiltInParamsCountError, WrongTypeError } from '@/store/errors';
import { GameState } from '@/store/state';
import { DeepReadonly, DRF, withChild, withParent } from '@/util/helper';
import { cloneNodeDeep, CloneResult, mapNodeDeep } from '@/util/nodes';
import { BaseNode, NodeMap } from '..';
import { createApplyNode, createArrayNode, createNumberNode, createPtupleNode } from '../util';




type BuiltinFn = (self: DRF<BuiltInIdentifierNode>, 
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
  [clonedRoot, clonedNodes, newNodeMap]: CloneResult, 
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

// Evaluate the "set" function, which nondestructively
// updates an array element. Return null if failure.
function builtinSet(
  node: DRF<BuiltInIdentifierNode>, 
  args: DRF[], 
  nodes: DeepReadonly<NodeMap>
): CloneResult {
  if (args.length !== 3)
    throw new WrongBuiltInParamsCountError(node.id, 3, args.length);
  
  const arr = args[0];
  const index = args[1];
  const value = args[2];

  if (arr.type !== 'array')
    throw new WrongTypeError(arr.id, 'array', arr.type);

  if (index.type !== 'number')
    throw new WrongTypeError(index.id, 'number', index.type);

  const indexValue = index.fields.value;

  if (indexValue >= arr.fields.length)
    throw new BuiltInError(node.id, `You tried to set item ${indexValue} of an array with only ${arr.fields.length} items`);

  const nodeToReplace = arr.subexpressions[indexValue];

  return mapNodeDeep(
    arr.subexpressions[indexValue],
    nodes,
    (node, nodeMap) => {
      if (node.id === nodeToReplace) {
        const [valueClone, , newNodeMap] = cloneNodeDeep(value.id, nodeMap);
        return [valueClone, newNodeMap];
      }

      return [node, nodeMap];
    }
  );
}

function builtinConcat(expr, semant, nodes) {
  const left = nodes.get(expr.subexpressions.arg_left);
  const right = nodes.get(expr.subexpressions.arg_right);

  if (left.type !== 'array') return null;
  if (right.type !== 'array') return null;
  const nl = left.length;
  const nr = right.length;
  const elems = [];
  for (let j = 0; j < nl + nr; j++) {
    const id = j < nl ? left.subexpressions[`elem${j}`]
      : right.subexpressions[`elem${j - nl}`];
    const e = hydrateLocked(nodes.get(id), semant, nodes);
    e.locked = true;
    elems.push(e);
  }
  return semant.array(nl + nr, ...elems);
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

// fold a f init = f(a[n-1], ..., f(a[2], f(a[1], f(a[0], init))))
//    let b = f(a[0], init) in
//      fold(a[1..], f, b)
//     = fold(a[1..], f, f(a[0], init))
// fold [] f init = init
function builtinFold(expr, semant, nodes) {
  const a = hydrateInput(nodes.get(expr.subexpressions.arg_a), semant, nodes);
  const n = a.length;
  const init = hydrateInput(nodes.get(expr.subexpressions.arg_init), semant, nodes);
  const f = nodes.get(expr.subexpressions.arg_f);
  const f1 = hydrateInput(f, semant, nodes);
  const f2 = hydrateInput(f, semant, nodes);

  if (n == 0) return init;

  const tail = [];
  for (let j = 1; j < n; j++) {
    tail.push(a.subexpressions[`elem${j}`]);
  }
  const a_tail = semant.array(n - 1, ...tail);
  let fncall;
  if (f2.type == 'identifier' && f2.fields.params?.length >= 2) {
    fncall = f2;
    f2.subexpressions[`arg_${f2.params[0]}`] = a.elem0;
    f2.subexpressions[`arg_${f2.params[1]}`] = init;
  } else {
    fncall = semant.apply(semant.apply(f2, a.subexpressions.elem0), init);
  }

  return semant.reference('fold', ['f', 'a', 'init'], f1, a_tail, fncall);
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
  // fold: builtinFold,
  // concat: builtinConcat,
};

/**
 * Represents an identifier for a function or object that is built into the game
 * (not defined using nodes.) Used to implement functions like set().
 */
export interface BuiltInIdentifierNode extends BaseNode {
  type: 'builtin';
  fields: { name: string };
}
