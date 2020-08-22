import { BuiltInIdentifierNode } from '.';
import { addClonedNodes } from './util';

import { BuiltInError, WrongBuiltInParamsCountError, WrongTypeError } from '@/store/errors';
import { GameState } from '@/store/state';
import { DeepReadonly, DRF } from '@/util/helper';
import { cloneNodeAndAddDeep } from '@/util/nodes';

export function builtinGet(self: DRF<BuiltInIdentifierNode>,
  args: DRF[],
  state: DeepReadonly<GameState>): DeepReadonly<GameState> {
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

  const result = cloneNodeAndAddDeep(arrayNode.subexpressions[index], state.nodes);
  return addClonedNodes(self, result, state);
}
