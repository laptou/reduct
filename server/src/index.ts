import * as Sentry from '@sentry/node';
import Koa from 'koa';
import KoaBodyParser from 'koa-bodyparser';

import { userLoggingRouter } from './logging/user';
import { initializeAuth, authMiddleware } from './auth';
import { serverLogger } from './logging/server';
import { environment, useAuthentication } from './config';

Sentry.init({ dsn: 'https://0a8675f3076947a3ba73a4ecb9f9d75c@o190059.ingest.sentry.io/5394738' });

void (async () => {
  serverLogger.info(`starting server in ${environment} mode`);

  const server = new Koa();

  server.on('error', (err, ctx) => {
    Sentry.withScope(function(scope) {
      scope.addEventProcessor(function(event) {
        return Sentry.Handlers.parseRequest(event, ctx.request);
      });
      Sentry.captureException(err);
    });
  });

  // body parser MUST be initialized for auth middleware
  // to work correctly
  server.use(KoaBodyParser());

  initializeAuth(server);
  serverLogger.debug('initialized authentication');

  if (useAuthentication) {
    // all middleware after this point will be authentication-gated
    server.use(authMiddleware);
  }

  server.use(userLoggingRouter.routes());

  if (environment === 'dev') {
    const { initializeDevServer } = await import('./dev');
    await initializeDevServer(server);
    serverLogger.debug('initialized dev server');
  } else {
    const { initializeProdServer } = await import('./prod');
    initializeProdServer(server);
    serverLogger.debug('initialized production server');
  }

  const port = process.env.PORT || 8080;
  server.listen(port);
  serverLogger.info(`listening on port ${port}`);
})();
