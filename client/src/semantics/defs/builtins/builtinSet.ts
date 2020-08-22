import { BuiltInIdentifierNode } from './builtins';
import { addClonedNodes } from './addClonedNodes';

import { BuiltInError, WrongBuiltInParamsCountError, WrongTypeError } from '@/store/errors';
import { GameState } from '@/store/state';
import { DeepReadonly, DRF } from '@/util/helper';
import { cloneNodeDeep, mapNodeDeep } from '@/util/nodes';

export function builtinSet(self: DRF<BuiltInIdentifierNode>,
  args: DRF[],
  state: DeepReadonly<GameState>): DeepReadonly<GameState> {
  if (args.length !== 3)
    throw new WrongBuiltInParamsCountError(self.id, 3, args.length);

  const arr = args[0];
  const index = args[1];
  const value = args[2];

  if (arr.type !== 'array')
    throw new WrongTypeError(arr.id, 'array', arr.type);

  if (index.type !== 'number')
    throw new WrongTypeError(index.id, 'number', index.type);

  const indexValue = index.fields.value;

  if (indexValue >= arr.fields.length)
    throw new BuiltInError(self.id, `You tried to set item ${indexValue} of an array with only ${arr.fields.length} items`);

  const nodeToReplace = arr.subexpressions[indexValue];

  return addClonedNodes(
    self,
    mapNodeDeep(
      arr.subexpressions[indexValue],
      nodes,
      (node, nodeMap) => {
        if (node.id === nodeToReplace) {
          const [valueClone, , newNodeMap] = cloneNodeDeep(value.id, nodeMap);
          return [valueClone, newNodeMap];
        }

        return [node, nodeMap];
      }
    ),
    state
  );
}
