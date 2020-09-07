import { BuiltinFn } from '.';

import { createVoidNode } from '@/semantics/util';
import { DRF } from '@/util/helper';

export const builtinEat: BuiltinFn = (_self, _args, state) => {
  const voidNode = createVoidNode() as DRF;

  return {
    ...state,
    nodes: new Map([
      ...state.nodes,
      [voidNode.id, voidNode],
    ]),
    returned: [voidNode.id],
  };
};
