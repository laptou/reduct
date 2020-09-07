import produce from 'immer';

import { ReferenceNode } from '../reference';

import { addClonedNodes } from './util';

import { BuiltInIdentifierNode } from '.';

import { BuiltInError, WrongBuiltInParamsCountError, WrongTypeError } from '@/store/errors';
import { GameState } from '@/store/state';
import { DeepReadonly, DRF } from '@/util/helper';
import { cloneNodeAndAddDeep } from '@/util/nodes';
import { createReferenceNode } from '@/semantics/util';

export function builtinGet(self: DRF<BuiltInIdentifierNode>,
  args: DRF[],
  state: DeepReadonly<GameState>): DeepReadonly<GameState> {
  if (args.length !== 2)
    throw new WrongBuiltInParamsCountError(self.id, 2, args.length);

  let arrayNode = args[0];
  const indexNode = args[1];

  // dereference param if we were given a reference to an array
  while (arrayNode.type !== 'array') {
    if (arrayNode.type !== 'reference') {
      throw new WrongTypeError(arrayNode.id, 'array', arrayNode.type);
    }

    arrayNode = state.nodes.get(arrayNode.fields.target)!;
  }

  if (indexNode.type !== 'number')
    throw new WrongTypeError(indexNode.id, 'number', indexNode.type);

  const index = indexNode.fields.value;
  const length = arrayNode.fields.length;

  if (index >= length)
    throw new BuiltInError(indexNode.id, `You tried to get item ${index} of an array with only ${length} items`);

  const targetNode = state.nodes.get(arrayNode.subexpressions[index])!;

  // if this points to a reference type, return a reference to it
  if (targetNode.type === 'array') {
    const referenceNode = createReferenceNode(targetNode.id) as DRF<ReferenceNode>;

    return produce(state, draft => {
      draft.nodes.set(referenceNode.id, referenceNode);
      draft.added.set(referenceNode.id, self.id);
      draft.returned = [referenceNode.id];
    });
  } else {
    const result = cloneNodeAndAddDeep(targetNode.id, state.nodes);
    return addClonedNodes(self, result, state);
  }
}
