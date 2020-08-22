import produce from 'immer';

import { addClonedNodes } from './util';

import { BuiltinFn } from '.';

import { BuiltInError, WrongBuiltInParamsCountError, WrongTypeError } from '@/store/errors';
import { cloneNodeAndAddDeep, mapNodeDeep } from '@/util/nodes';

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

      const nodeIdToReplace = array.subexpressions[indexValue];

      draft.removed.set(nodeIdToReplace, false);

      const nodeToReplace = draft.nodes.get(nodeIdToReplace)!;
      nodeToReplace.parent = null;
      nodeToReplace.parentField = null;

      array.subexpressions[indexValue]
    });

    const nodeToReplace = arrayRef.subexpressions[indexValue];

    return addClonedNodes(
      self,
      mapNodeDeep(
        arrayRef.subexpressions[indexValue],
        state.nodes,
        (node, nodeMap) => {
          if (node.id === nodeToReplace) {
            const [valueClone, , newNodeMap] = cloneNodeAndAddDeep(value.id, nodeMap);
            return [valueClone, newNodeMap];
          }

          return [node, nodeMap];
        }
      ),
      state
    );
  };
