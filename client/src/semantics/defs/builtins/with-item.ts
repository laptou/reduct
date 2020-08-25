import produce from 'immer';

import { addClonedNodes } from './util';

import { BuiltinFn } from '.';

import { BuiltInError, WrongBuiltInParamsCountError, WrongTypeError } from '@/store/errors';
import { cloneNodeAndAddDeep, mapNodeDeep } from '@/util/nodes';
import { createArrayNode } from '@/semantics/util';
import { DRF } from '@/util/helper';

export const builtinWith: BuiltinFn =
  (self, args, state) => {
    if (args.length !== 3)
      throw new WrongBuiltInParamsCountError(self.id, 3, args.length);

    const array = args[0];
    const index = args[1];
    const value = args[2];

    if (array.type !== 'array')
      throw new WrongTypeError(array.id, 'array', array.type);

    if (index.type !== 'number')
      throw new WrongTypeError(index.id, 'number', index.type);

    const indexValue = index.fields.value;

    if (indexValue >= array.fields.length)
      throw new BuiltInError(self.id, `You tried to set item ${indexValue} of an array with only ${array.fields.length} items`);

    const newChildIds: number[] = [];

    for (let i = 0; i < array.fields.length; i++) {
      if (i !== indexValue) {
        newChildIds.push(array.subexpressions[i]);
      } else {
        newChildIds.push(value.id);
      }
    }

    return produce(state, draft => {
      const newArrayNode = createArrayNode(...newChildIds);
      draft.returned = [newArrayNode.id];
      draft.nodes.set(newArrayNode.id, newArrayNode);
      draft.added.set(newArrayNode.id, self.id);
    });
  };
