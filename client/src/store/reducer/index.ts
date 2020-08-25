import { combineReducers } from 'redux';
import { createTransform, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import {
  createStartLevel, createGoToSurvey, createGoToTitle, createGoToTutorial,
} from '../action/game';
import { GameState, GameMode, StatsState } from '../state';

import { gameReducer } from './game';
import { preferencesReducer } from './preferences';
import { undoableReducer } from './undo';
import { statsReducer } from './stats';

export { nextId } from '@/util/nodes';

interface SerializedState {
  level: number;
  mode: GameMode;
}

const gameStateTransform = createTransform(
  // transform state on its way to being serialized and persisted.
  ($present: GameState) => {
    if (!$present) return $present;

    return {
      mode: $present.mode,
      level: $present.level,
    } as SerializedState;
  },
  // transform state being rehydrated
  ($present: SerializedState) => {
    switch ($present.mode) {
    case GameMode.Credits:
    case GameMode.Gameplay:
      if ($present.level >= 0) {
        // load up the level, then navigate to title screen
        let state = gameReducer(undefined, createStartLevel($present.level));
        state = gameReducer(state, createGoToTitle());
        return state;
      }

      return gameReducer();
    case GameMode.Survey:
      return gameReducer(undefined, createGoToSurvey());
    case GameMode.Tutorial:
      return gameReducer(undefined, createGoToTutorial());
    case GameMode.Title:
      return gameReducer(undefined, createGoToTitle());
    default:
      return gameReducer();
    }
  }
);

const statsTransform = createTransform<StatsState>(
  // transform state on its way to being serialized and persisted.
  (item, key) => {
    switch (key) {
    case 'levels':
      return Object.fromEntries(item.entries());
    default:
      return item;
    }
  },
  // transform state being rehydrated
  (serializedItem, key) => {
    switch (key) {
    case 'levels':
      return new Map(
        Object
          .entries(serializedItem)
          .map(([key, val]) => [parseInt(key), val])
      );
    default:
      return serializedItem;
    }
  }
);

export function createReducer() {
  const version = parseInt(PKG_VERSION.replace(/\D/g, '')); // 7.0.0-alpha = 700

  const gameReducerPersisted = persistReducer(
    {
      key: 'reduct/game',
      storage,
      version,
      transforms: [gameStateTransform],
      whitelist: ['$present'],
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

  const statsReducerPersisted = persistReducer(
    {
      key: 'reduct/stats',
      storage,
      version,
      transforms: [statsTransform],
    },
    statsReducer
  );

  const rootReducer = combineReducers({
    game: gameReducerPersisted,
    preferences: preferencesReducerPersisted,
    stats: statsReducerPersisted,
  });

  return rootReducer;
}
