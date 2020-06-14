import '@resources/style/react/index.scss';
import React from 'react';
import { hot } from 'react-hot-loader/root';
import { Provider } from 'react-redux';
import { Board } from './stage/board';
import { Toolbox } from './stage/toolbox';
import { Definitions } from './stage/definitions';

// TODO: fix type for `store`
export function App({ store }: { store: any }) {
  return (
    <Provider store={store}>
      <Board />
      <Toolbox />
      <Definitions />
    </Provider>
  )
}

export const HotApp = hot(App);
