import Koa from 'koa';
import KoaBodyParser from 'koa-bodyparser';

import { userLoggingRouter } from './logging/user';
import { initializeAuth, authMiddleware } from './auth';
import { initializeDevServer } from './dev';
import { initializeProdServer } from './prod';
import { serverLogger } from './logging/server';
import { environment } from './config';

(async () => {
  serverLogger.info(`starting server in ${environment} mode`);

  const server = new Koa();

  // body parser MUST be initialized for auth middleware
  // to work correctly
  server.use(KoaBodyParser());

  initializeAuth(server);
  serverLogger.debug('initialized authentication');

  // all middleware after this point will be authentication-gated
  server.use(authMiddleware);

  server.use(userLoggingRouter.routes());

  if (environment === 'dev') {
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
