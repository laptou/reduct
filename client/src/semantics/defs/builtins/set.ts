import { produce } from 'immer';

import { BuiltinFn } from '.';

import { BuiltInError, WrongBuiltInParamsCountError, WrongTypeError } from '@/store/errors';
import { cloneNodeDeep } from '@/util/nodes';

export const builtinSet: BuiltinFn =
  (self, args, state) => {
    if (args.length !== 3)
      throw new WrongBuiltInParamsCountError(self.id, 3, args.length);

    const arrayRef = args[0];
    const index = args[1];
    const value = args[2];

    if (arrayRef.type !== 'reference')
      throw new WrongTypeError(arrayRef.id, 'reference', arrayRef.type);

    if (index.type !== 'number')
      throw new WrongTypeError(index.id, 'number', index.type);

    const indexValue = index.fields.value;

    return produce(state, draft => {
      const array = draft.nodes.get(arrayRef.fields.target)!;

      if (array.type !== 'array')
        throw new WrongTypeError(arrayRef.id, 'array', arrayRef.type);

      if (indexValue >= array.fields.length)
        throw new BuiltInError(self.id, `You tried to set item ${indexValue} of an array with only ${array.fields.length} items`);

      const nodeToReplace = draft.nodes.get(array.subexpressions[indexValue])!;
      nodeToReplace.parent = null;
      nodeToReplace.parentField = null;

      const [valueClone, valueCloneDescendants] =
        cloneNodeDeep(value.id, draft.nodes, true);

      array.subexpressions[indexValue] = valueClone.id;

      draft.added.set(valueClone.id, nodeToReplace.id);
      draft.returned = arrayRef.id;

      for (const newNode of [valueClone, ...valueCloneDescendants]) {
        draft.nodes.set(newNode.id, newNode);
      }

      draft.removed.set(nodeToReplace.id, false);
    });
  };
