import React from 'react';
import { Provider } from 'react-redux';
import Board from './stage/board';
import '@resources/style/react/index.scss';


// TODO: fix type for `store`
export function App({ store }: { store: any }) {
  return (
    <Provider store={store}>
      <Board />
    </Provider>
  )
}
