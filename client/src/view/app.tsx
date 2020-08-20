import '@resources/style/react/index.scss';
import * as Sentry from '@sentry/react';
import React, { Suspense } from 'react';
import { hot } from 'react-hot-loader/root';
import { Provider } from 'react-redux';

import { ErrorDisplay } from './stage/ui/modals/error';
import { LoadingPage } from './stage/ui/loading';

const Game = React.lazy(async () => {
  // load modules of code and retrieve assets
  const [game, store] = await Promise.all([
    import(/* webpackChunkName: "game" */ './game'),
    import(/* webpackChunkName: "store" */ '@/store'),
    import(/* webpackChunkName: "loader" */ '@/loader')
      .then((loader) => Promise.all([
        loader.loadAudio('level-complete'),
        loader.loadAudio('level-incomplete'),
        loader.loadAudio('drip'),
        loader.loadAudio('pop'),
        loader.loadChapters(),
      ])),
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

export const App: React.FC = () => {
  return (
    <Sentry.ErrorBoundary showDialog fallback={ErrorDisplay}>
      <Suspense fallback={<LoadingPage />}>
        <Game />
      </Suspense>
    </Sentry.ErrorBoundary>
  );
};

export const HotApp = hot(App);
