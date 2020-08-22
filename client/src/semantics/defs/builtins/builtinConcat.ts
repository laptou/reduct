import { produce, castDraft } from 'immer';

import { createArrayNode } from '../../util';

import { BuiltInIdentifierNode } from './builtins';

import { WrongBuiltInParamsCountError, WrongTypeError } from '@/store/errors';
import { GameState } from '@/store/state';
import { DeepReadonly, DRF } from '@/util/helper';
import { cloneNodeDeep } from '@/util/nodes';

export function builtinConcat(self: DRF<BuiltInIdentifierNode>,
  args: DRF[],
  state: DeepReadonly<GameState>): DeepReadonly<GameState> {
  if (args.length !== 2)
    throw new WrongBuiltInParamsCountError(self.id, 2, args.length);

  const [left, right] = args;

  if (left.type !== 'array')
    throw new WrongTypeError(left.id, 'array', left.type);

  if (right.type !== 'array')
    throw new WrongTypeError(right.id, 'array', right.type);

  return produce(state, draft => {
    const newArr = createArrayNode();
    newArr.fields.length = left.fields.length + right.fields.length;
    newArr.parent = self.parent;
    newArr.parentField = self.parentField;

    draft.nodes.set(newArr.id, newArr);
    draft.added.set(newArr.id, self.id);

    let i = 0;

    for (let j = 0; j < left.fields.length; j++) {
      const childId = left.subexpressions[j];
      const child = draft.nodes.get(childId)!;

      // update child before cloning so we can use draft object
      child.parent = newArr.id;
      child.parentField = i.toString(10);

      const [childClone, , newNodeMap] = cloneNodeDeep(childId, draft.nodes);

      draft.nodes = castDraft(newNodeMap);
      newArr.subexpressions[i] = childClone.id;
      i++;
    }

    for (let k = 0; k < right.fields.length; k++) {
      const childId = right.subexpressions[k];
      const child = draft.nodes.get(childId)!;

      // update child before cloning so we can use draft object
      child.parent = newArr.id;
      child.parentField = i.toString(10);

      const [childClone, , newNodeMap] = cloneNodeDeep(childId, draft.nodes);

      draft.nodes = castDraft(newNodeMap);
      newArr.subexpressions[i] = childClone.id;
      i++;
    }
  });
}
