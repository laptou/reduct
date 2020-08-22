
import { BaseNode } from '../..';

import { builtinGet } from './builtinGet';
import { builtinSet } from './builtinSet';
import { builtinConcat } from './builtinConcat';
import { builtinMap } from './builtinMap';
import { builtinSlice } from './builtinSlice';
import { builtinLength } from './builtinLength';

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
