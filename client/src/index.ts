import '@resources/style/index.css';
import * as Sentry from '@sentry/react';
import { enableMapSet } from 'immer';

import 'react-hot-loader';
import { initReactApp } from './view';
import { startLogging } from './logging/logger';
import { getNetId } from './auth';


if (PKG_ENV === 'production') {
  // initialize Sentry (logging + error tracking)
  Sentry.init({
    dsn: 'https://4960b765fb5d4f269fe7abc68734abfd@o190059.ingest.sentry.io/5310258',
    environment: PKG_ENV,
  });
}

// initialize Immer (immutable state creation)
enableMapSet();
startLogging();

try {
  console.log(`Reduct v${PKG_VERSION} ${PKG_ENV}`);
  initReactApp();
  getNetId()
    .then(netId =>
      Sentry.configureScope((scope) => {
        scope.setUser({ id: netId });
      }))
    .catch(error => Sentry.captureException(error));
} catch (error) {
  if (PKG_ENV === 'production')
    Sentry.captureException(error);
  else
    console.error(error);
}
