import { GlobalState } from '@/reducer/state';
import '@resources/style/react/index.scss';
import React from 'react';
import { hot } from 'react-hot-loader/root';
import { Provider } from 'react-redux';
import type { Store } from 'redux';
import * as Sentry from '@sentry/react';
import { Game } from './game';
import { ErrorDisplay } from './banner/error';

// TODO: fix type for `store`
export function App({ store }: { store: Store<GlobalState> }) {
  return (
    <Provider store={store as any}>
      <Sentry.ErrorBoundary showDialog fallback={ErrorDisplay}>
        <Game />
      </Sentry.ErrorBoundary>
    </Provider>
  )
}

export const HotApp = hot(App);
