import React from 'react';
import ReactDOM from 'react-dom';

import { HotApp } from './app';

export function initReactApp() {
  ReactDOM.render(<HotApp />, document.getElementById('reduct-react'));

  if (module.hot) {
    module.hot.accept('.', () => {
      const { HotApp: NewHotApp } = require('./app');
      ReactDOM.render(<NewHotApp />, document.getElementById('reduct-react'));
    });
  }
}
