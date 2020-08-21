import { compose, applyMiddleware, createStore } from 'redux';
import { persistStore } from 'redux-persist';

import { ActionKind } from './action/game';
import { createReducer } from './reducer';

import { logMiddleware } from '@/logging';

let composer;

if (PKG_ENV === 'development') {
  if (window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
    composer = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
      serialize: true,
      actionsBlacklist: [ActionKind.Raise],
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

export const persistor = persistStore(store, { manualPersist: true } as any);
