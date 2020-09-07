import { compose, applyMiddleware, createStore } from 'redux';
import { persistStore } from 'redux-persist';

import { ActionKind, createGoToGameplay, createStartLevel } from './action/game';
import { createReducer } from './reducer';

import { logMiddleware } from '@/logging';
import { log } from '@/logging/logger';
import { getNetId } from '@/auth';

let composer;

if (PKG_ENV === 'development') {
  if (window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
    composer = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
      serialize: true,
      actionsBlacklist: [ActionKind.Raise, ActionKind.Cleanup],
    });
  } else {
    composer = compose;
  }
} else {
  composer = compose;
}

export const store = createStore(
  createReducer(),
  composer(applyMiddleware(logMiddleware))
);

export const persistor = persistStore(store, { manualPersist: true } as any, () => {
  const state = store.getState();

  const levels = Object.fromEntries(state.stats.levels.entries());
  const startTime = state.stats.startTime;

  log('game:rehydrate');
  log('game:stats', {
    levels,
    startTime,
  });
});

window.func9324 = () => {
  store.dispatch({ type: ActionKind.ResetTime });
  store.dispatch(createStartLevel(0));
  store.dispatch(createGoToGameplay());
  console.log('your time has been reset. please close the developer tools now.');
  console.log('we are notified when you use this function.');
};
