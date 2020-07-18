import { combineReducers } from 'redux';
import { createTransform, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { createStartLevel } from '../action';
import { game } from './game';
import { GlobalState, RState } from '../state';
import { undoable } from './undo';

export { nextId } from '@/util/nodes';

interface SerializedState {
  level: number;
}

const gameStateTransform = createTransform(
  // transform state on its way to being serialized and persisted.
  ($present: RState) => {
    if (!$present) return $present;

    return { 
      level: $present.level
    } as SerializedState;
  },
  // transform state being rehydrated
  ($present: SerializedState) => {
    if ($present.level >= 0) {
      return game(undefined, createStartLevel($present.level));
    }

    return game();
  },
  { whitelist: ['$present'] }
);

export function createReducer() {
  const gameReducer = undoable(game);

  return combineReducers<GlobalState>({
    program: persistReducer(
      { 
        key: 'reduct', 
        storage,
        whitelist: ['$present'], // do not save undo history
        version: parseInt(PKG_VERSION.replace(/\D/, '')), // 7.0.0-alpha = 700
        transforms: [gameStateTransform]
        
      },
      gameReducer
    )
  });
}
