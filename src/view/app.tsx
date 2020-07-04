import { GlobalState } from '@/reducer/state';
import '@resources/style/react/index.scss';
import React from 'react';
import { hot } from 'react-hot-loader/root';
import { Provider } from 'react-redux';
import type { Store } from 'redux';
import { Board } from './stage/board';
import { Defeat } from './stage/defeat';
import { Definitions } from './stage/definitions';
import { Goal } from './stage/goal';
import { History } from './stage/history';
import { LevelInfo } from './stage/level';
import { Toolbox } from './stage/toolbox';
import { Victory } from './stage/victory';

// TODO: fix type for `store`
export function App({ store }: { store: Store<GlobalState> }) {
  return (
    <Provider store={store as any}>
      <Board />
      <Toolbox />
      <Definitions />
      <Goal />
      <LevelInfo />
      <History />
      <Victory />
      <Defeat />
    </Provider>
  )
}

export const HotApp = hot(App);
