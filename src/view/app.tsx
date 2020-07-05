import { persistor } from '@/store';
import { GlobalState } from '@/store/state';
import '@resources/style/react/index.scss';
import * as Sentry from '@sentry/react';
import React from 'react';
import { hot } from 'react-hot-loader/root';
import { Provider } from 'react-redux';
import type { Store } from 'redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ErrorDisplay } from './banner/error';
import { Game } from './game';

// TODO: fix type for `store`
export function App({ store }: { store: Store<GlobalState> }) {
  return (
    <Provider store={store as any}>
      <Sentry.ErrorBoundary showDialog fallback={ErrorDisplay}>
        <PersistGate loading={null} persistor={persistor}>
          <Game />
        </PersistGate>
      </Sentry.ErrorBoundary>
    </Provider>
  )
}

export const HotApp = hot(App);
