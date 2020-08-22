
import { BaseNode } from '../..';

import { builtinGet } from './get';
import { builtinSet } from './set';
import { builtinConcat } from './concat';
import { builtinMap } from './map';
import { builtinSlice } from './slice';
import { builtinLength } from './length';

import {
  DeepReadonly, DRF,
} from '@/util/helper';
import { GameState } from '@/store/state';

type BuiltinFn = (
  self: DRF<BuiltInIdentifierNode>,
  args: DRF[],
  state: DeepReadonly<GameState>
) => DeepReadonly<GameState>;

export const builtins: Record<string, BuiltinFn> = {
  length: builtinLength,
  get: builtinGet,
  set: builtinSet,
  map: builtinMap,
  slice: builtinSlice,
  concat: builtinConcat,
};

/**
 * Represents an identifier for a function or object that is built into the game
 * (not defined using nodes.) Used to implement functions like set().
 */
export interface BuiltInIdentifierNode extends BaseNode {
  type: 'builtin';
  fields: { name: string };
}
