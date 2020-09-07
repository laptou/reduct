import { NodeMap } from '../..';
import { createApplyNode, createArrayNode, createPtupleNode } from '../../util';

import { addClonedNodes } from './util';

import { BuiltInIdentifierNode } from '.';

import { WrongBuiltInParamsCountError, WrongTypeError } from '@/store/errors';
import { GameState } from '@/store/state';
import { DeepReadonly, DRF, withParent } from '@/util/helper';
import { cloneNodeAndAddDeep } from '@/util/nodes';

export function builtinMap(self: DRF<BuiltInIdentifierNode>,
  args: DRF[],
  state: DeepReadonly<GameState>): DeepReadonly<GameState> {
  if (args.length !== 2)
    throw new WrongBuiltInParamsCountError(self.id, 2, args.length);

  let arr = args[0];
  const fn = args[1];

  while (arr.type === 'reference') {
    arr = state.nodes.get(arr.fields.target)!;
  }

  if (arr.type !== 'array')
    throw new WrongTypeError(arr.id, 'array', arr.type);

  if (fn.type !== 'lambda' && fn.type !== 'builtin')
    throw new WrongTypeError(fn.id, ['lambda', 'builtin'], fn.type);

  // create an apply node for each item in the array
  let newNodeMap: DeepReadonly<NodeMap> = state.nodes;
  const applyNodes: DRF[] = [];
  const ptupleNodes: DRF[] = [];
  const fnNodes: DRF[] = [];
  const newNodes: DRF[] = [];
  const newArr = createArrayNode();
  newArr.fields.length = arr.fields.length;

  for (const [index, itemId] of Object.entries(arr.subexpressions)) {
    const [clonedFn, clonedFnChildren, nodeMapWithClone] = cloneNodeAndAddDeep(fn.id, newNodeMap);
    const ptupleNode = createPtupleNode(itemId);
    const applyNode = createApplyNode(clonedFn.id, ptupleNode.id);

    const clonedFnWithParent = withParent(clonedFn, applyNode.id, 'callee');

    ptupleNode.parent = applyNode.id;
    ptupleNode.parentField = 'argument';

    applyNode.parent = newArr.id;
    applyNode.parentField = index;

    newArr.subexpressions[index] = applyNode.id;

    newNodes.push(clonedFnWithParent, ...clonedFnChildren, ptupleNode, applyNode);
    fnNodes.push(clonedFnWithParent);
    ptupleNodes.push(ptupleNode);
    applyNodes.push(applyNode);
    newNodeMap = nodeMapWithClone;
  }

  newNodeMap = new Map([
    ...newNodeMap,
    ...fnNodes.map(fnNode => [fnNode.id, fnNode] as const),
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
