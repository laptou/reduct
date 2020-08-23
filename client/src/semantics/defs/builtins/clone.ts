import { addClonedNodes } from './util';

import { BuiltinFn } from '.';

import { WrongBuiltInParamsCountError } from '@/store/errors';
import { cloneNodeDeep } from '@/util/nodes';

export const builtinClone: BuiltinFn =
  (self, args, state) => {
    if (args.length !== 1)
      throw new WrongBuiltInParamsCountError(self.id, 1, args.length);

    const [nodeToCopy] = args;

    const targetId =
      nodeToCopy.type === 'reference'
        ? nodeToCopy.fields.target
        : nodeToCopy.id;

    const result = cloneNodeDeep(targetId, state.nodes);
    return addClonedNodes(self, result, state);
  };
