import { GlobalState } from '@/reducer/state';
import '@resources/style/react/index.scss';
import React from 'react';
import { hot } from 'react-hot-loader/root';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { Board } from './stage/board';
import { Definitions } from './stage/definitions';
import { Goal } from './stage/goal';
import { Toolbox } from './stage/toolbox';
import { Victory } from './stage/victory';
import { Defeat } from './stage/defeat';
import { LevelInfo } from './stage/level';

// TODO: fix type for `store`
export function App({ store }: { store: Store<GlobalState> }) {
  return (
    <Provider store={store as any}>
      <Board />
      <Toolbox />
      <Definitions />
      <Goal />
      <LevelInfo />
      <Victory />
      <Defeat />
    </Provider>
  )
}

export const HotApp = hot(App);
