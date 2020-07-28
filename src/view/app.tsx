import '@resources/style/react/index.scss';
import * as Sentry from '@sentry/react';
import React, { Suspense } from 'react';
import { hot } from 'react-hot-loader/root';
import { Provider } from 'react-redux';

import { ErrorDisplay } from './banner/error';
import { LoadingAnimationWithText } from './stage/ui/loading';

import * as progression from '@/game/progression';
import Loader from '@/loader';

const Game = React.lazy(async () => {
  // load assets and code
  const promises = [
    await import('./game'),
    await import('@/store'),
    Loader.loadAudioSprite('sounds', 'output'),
    Loader.loadImageAtlas('spritesheet', 'assets', 'assets.png'),
    Loader.loadImageAtlas('titlesprites', 'title-assets', 'title-assets.png'),
    Loader.loadImageAtlas('menusprites', 'menu-assets', 'menu-assets.png'),
    Loader.loadChapters('Elementary', progression.ACTIVE_PROGRESSION_DEFINITION),
  ] as const;

  // retrieve loaded code modules
  const [game, store] = await Promise.all(promises);

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
      <Suspense fallback={<h1>loading</h1>}>
        <Game />
      </Suspense>
      <LoadingAnimationWithText />
    </Sentry.ErrorBoundary>
  );
}

export const HotApp = hot(App);
