import '@resources/style/react/index.scss';
import * as Sentry from '@sentry/react';
import React, { Suspense } from 'react';
import { hot } from 'react-hot-loader/root';
import { Provider } from 'react-redux';

import { ErrorDisplay } from './banner/error';
import { LoadingPage } from './stage/ui/loading';

import * as progression from '@/game/progression';

const Game = React.lazy(async () => {
  const assetsPromise = 
    import(/* webpackChunkName: "loader" */ '@/loader')
      .then(({ default: loader }) => Promise.all([
        loader.loadAudioSprite('sounds', 'output'),
        // comment this out b/c no images are currently used in the game
        // loader.loadImageAtlas('spritesheet', 'assets', 'assets.png'),
        // loader.loadImageAtlas('titlesprites', 'title-assets', 'title-assets.png'),
        // loader.loadImageAtlas('menusprites', 'menu-assets', 'menu-assets.png'),
        loader.loadChapters('Elementary', progression.ACTIVE_PROGRESSION_DEFINITION),
      ]));

  // load modules of code and retrieve assets
  const [game, store] = await Promise.all([
    import(/* webpackChunkName: "game" */ './game'),
    import(/* webpackChunkName: "store" */ '@/store'),
    assetsPromise,
  ]);

  // wait for persistor to load state into store
  await new Promise((resolve) => {
    const unsubscriber = store.persistor.subscribe(() => {
      unsubscriber();
      resolve();
    });

    store.persistor.persist();
  });

  const GameWithProvider: React.FC = () => {
    return (
      <Provider store={store.store}>
        <game.Game />
      </Provider>
    );
  };
  
  return { default: GameWithProvider };
});

export function App() {
  return (
    <Sentry.ErrorBoundary showDialog fallback={ErrorDisplay}>
      <Suspense fallback={<LoadingPage />}>
        <Game />
      </Suspense>
    </Sentry.ErrorBoundary>
  );
}

export const HotApp = hot(App);
