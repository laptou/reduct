import { combineReducers } from 'redux';
import { createTransform, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { createStartLevel } from '../action/game';
import { GameState } from '../state';
import { gameReducer } from './game';
import { preferencesReducer } from './preferences';
import { undoableReducer } from './undo';

export { nextId } from '@/util/nodes';

interface SerializedState {
  level: number;
}

const gameStateTransform = createTransform(
  // transform state on its way to being serialized and persisted.
  ($present: GameState) => {
    if (!$present) return $present;

    return { 
      level: $present.level,
    } as SerializedState;
  },
  // transform state being rehydrated
  ($present: SerializedState) => {
    if ($present.level >= 0) {
      return gameReducer(undefined, createStartLevel($present.level));
    }

    return gameReducer();
  },
  { whitelist: ['$present'] }
);

export function createReducer() {
  const version = parseInt(PKG_VERSION.replace(/\D/g, '')); // 7.0.0-alpha = 700

  const gameReducerPersisted = persistReducer(
    { 
      key: 'reduct/game', 
      storage,
      version,
      transforms: [gameStateTransform],
    },
    undoableReducer(gameReducer)
  );

  const preferencesReducerPersisted = persistReducer(
    { 
      key: 'reduct/preferences', 
      storage,
      version,
    },
    preferencesReducer
  );

  const rootReducer = combineReducers({
    game: gameReducerPersisted,
    preferences: preferencesReducerPersisted,
  });

  return rootReducer;
}
