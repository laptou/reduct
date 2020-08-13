import Koa from 'koa';
import KoaBodyParser from 'koa-bodyparser';

import { initializeAuth, authMiddleware } from './auth';
import { initializeDevServer } from './dev';
import { initializeProdServer } from './prod';
import { serverLogger } from './logging/server';

const mode = process.env.NODE_ENV === 'development' ? 'dev' : 'prod';

(async () => {
  serverLogger.info(`starting server in ${mode} mode`);

  const server = new Koa();

  // body parser MUST be initialized for auth middleware
  // to work correctly
  server.use(KoaBodyParser());

  initializeAuth(server);
  serverLogger.debug('initialized authentication');

  // all middleware after this point will be authentication-gated
  server.use(authMiddleware);

  if (mode === 'dev') {
    await initializeDevServer(server);
    serverLogger.debug('initialized dev server');
  } else {
    initializeProdServer(server);
    serverLogger.debug('initialized production server');
  }

  const port = process.env.PORT || 8080;
  server.listen(port);
  serverLogger.info(`listening on port ${port}`);
})();
