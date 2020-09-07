import { createArrayNode } from '../../util';

import { addClonedNodes } from './util';

import { BuiltInIdentifierNode } from '.';

import { BuiltInError, WrongBuiltInParamsCountError, WrongTypeError } from '@/store/errors';
import { GameState } from '@/store/state';
import { DeepReadonly, DRF } from '@/util/helper';
import { cloneNodeAndAddDeep } from '@/util/nodes';

export function builtinSlice(self: DRF<BuiltInIdentifierNode>,
  args: DRF[],
  state: DeepReadonly<GameState>): DeepReadonly<GameState> {
  if (args.length !== 3)
    throw new WrongBuiltInParamsCountError(self.id, 2, args.length);

  let arrayNode = args[0];
  const indexStartNode = args[1];
  const indexEndNode = args[2];

  while (arrayNode.type === 'reference') {
    arrayNode = state.nodes.get(arrayNode.fields.target)!;
  }

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
    const [clone, descendants, newNodeMap] = cloneNodeAndAddDeep(
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
