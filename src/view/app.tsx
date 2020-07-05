import { GlobalState } from '@/reducer/state';
import '@resources/style/react/index.scss';
import React from 'react';
import { hot } from 'react-hot-loader/root';
import { Provider } from 'react-redux';
import type { Store } from 'redux';
import { Game } from './game';

// TODO: fix type for `store`
export function App({ store }: { store: Store<GlobalState> }) {
  return (
    <Provider store={store as any}>
      <Game />
    </Provider>
  )
}

export const HotApp = hot(App);
