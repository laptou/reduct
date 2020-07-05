import '@resources/style/index.css';
import 'react-hot-loader';

import {
  createStore, applyMiddleware, compose, Store 
} from 'redux';
import * as Sentry from '@sentry/react';
import { logMiddleware } from './logging';

import * as progression from './game/progression';
import * as action from './reducer/action';

import Loader from './loader';

import { enableMapSet } from 'immer';
import { initReactApp } from './view';
import { createReducer } from './reducer/reducer';
import { GlobalState } from './reducer/state';

export let store: Store<GlobalState>;

// initialize Sentry (logging + error tracking)
Sentry.init({ dsn: 'https://4960b765fb5d4f269fe7abc68734abfd@o190059.ingest.sentry.io/5310258' });

// initialize Immer (immutable state creation)
enableMapSet();

(async () => {
 
  // Load assets.
  await Loader.loadAudioSprite('sounds', 'output');
  await Loader.loadImageAtlas('spritesheet', 'assets', 'assets.png');
  await Loader.loadImageAtlas('titlesprites', 'title-assets', 'title-assets.png');
  await Loader.loadImageAtlas('menusprites', 'menu-assets', 'menu-assets.png');
  await Loader.loadChapters('Elementary', progression.ACTIVE_PROGRESSION_DEFINITION);
  await Loader.waitForFonts(['Fira Mono', 'Fira Sans', 'Nanum Pen Script']);

  let composer;

  if (PKG_ENV === 'development') {
    if (window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
      composer = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({ 
        serialize: true,
        actionsBlacklist: [action.ActionKind.Cleanup, action.ActionKind.Raise, action.ActionKind.DetectCompletion]
      });
    } else {
      composer = compose;
    }
  } else {
    composer = compose;
  }
    
  store = createStore(
    createReducer(),
    composer(applyMiddleware(logMiddleware))
  );

  initReactApp(store);
})().catch(error => {
  Sentry.captureException(error);
});
