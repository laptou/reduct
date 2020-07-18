import { ActionKind } from './action';
import { compose, applyMiddleware, createStore } from 'redux';
import { createReducer } from './reducer';
import { logMiddleware } from '@/logging';
import { persistStore } from 'redux-persist';

let composer;

if (PKG_ENV === 'development') {
  if (window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
    composer = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({ 
      serialize: true,
      actionsBlacklist: [ActionKind.Raise, ActionKind.DetectCompletion]
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
