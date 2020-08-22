import { createNumberNode } from '../../util';

import { BuiltInIdentifierNode } from './builtins';
import { addClonedNodes } from './addClonedNodes';

import { WrongBuiltInParamsCountError, WrongTypeError } from '@/store/errors';
import { GameState } from '@/store/state';
import { DeepReadonly, DRF } from '@/util/helper';

export function builtinLength(self: DRF<BuiltInIdentifierNode>,
  args: DRF[],
  state: DeepReadonly<GameState>): DeepReadonly<GameState> {
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
