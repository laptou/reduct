import React from 'react';
import { Provider } from 'react-redux';
import Board from './stage/board';
import { hot } from 'react-hot-loader/root';
import '@resources/style/react/index.scss';

// TODO: fix type for `store`
export function App({ store }: { store: any }) {
  return (
    <Provider store={store}>
      <Board />
    </Provider>
  )
}

export const HotApp = hot(App);
