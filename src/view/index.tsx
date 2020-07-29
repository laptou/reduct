import React from 'react';
import ReactDOM from 'react-dom';

import { HotApp } from './app';

export function initReactApp(store: any) {
  ReactDOM.render(<HotApp store={store} />, document.getElementById('reduct-react'));

  if (module.hot) {
    module.hot.accept('.', () => {
      const { HotApp: NewHotApp } = require('./app');
      ReactDOM.render(<NewHotApp store={store} />, document.getElementById('reduct-react'));
    });
  }
}
