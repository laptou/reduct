import { createServer } from 'http';
import { createServer as createSecureServer } from 'https';
import { promises as fs } from 'fs';
import { resolve } from 'path';

import * as Sentry from '@sentry/node';
import Koa from 'koa';
import KoaBodyParser from 'koa-bodyparser';

import { userLoggingRouter } from './logging/user';
import { initializeAuth, authMiddleware } from './auth';
import { serverLogger } from './logging/server';
import { ENV, USE_AUTHENTICATION, USE_HTTPS } from './config';

const { readFile } = fs;

Sentry.init({ dsn: 'https://0a8675f3076947a3ba73a4ecb9f9d75c@o190059.ingest.sentry.io/5394738' });

void (async () => {
  serverLogger.info(`starting server in ${ENV} mode`);

  const app = new Koa();

  app.on('error', (err, ctx) => {
    if (ENV === 'prod') {
      Sentry.withScope(function(scope) {
        scope.addEventProcessor(function(event) {
          return Sentry.Handlers.parseRequest(event, ctx.request);
        });
        scope.setUser({ username: ctx.state?.user?.netId });
        Sentry.captureException(err);
      });
    }

    serverLogger.error(err);
  });

  // body parser MUST be initialized for auth middleware
  // to work correctly
  app.use(KoaBodyParser());

  await initializeAuth(app);
  serverLogger.debug('initialized authentication');

  if (USE_AUTHENTICATION) {
    // all middleware after this point will be authentication-gated
    app.use(authMiddleware);
  }

  app.use(userLoggingRouter.routes());

  if (ENV === 'dev') {
    const { initializeDevServer } = await import('./dev');
    await initializeDevServer(app);
    serverLogger.debug('initialized dev server');
  } else {
    const { initializeProdServer } = await import('./prod');
    initializeProdServer(app);
    serverLogger.debug('initialized production server');
  }

  const port = process.env.PORT || 8080;

  if (USE_HTTPS) {
    serverLogger.info('using HTTPS');

    if (ENV === 'prod')
      serverLogger.warn('HTTPS should not be used in production; it is handled by App Engine');

    const key = await readFile(resolve(__dirname, '../secret/localhost.key'));
    const cert = await readFile(resolve(__dirname, '../secret/localhost.crt'));

    const server = createSecureServer(
      {
        key,
        cert,
      },
      app.callback()
    );

    server.listen(port);
  } else {
    const server = createServer(
      {},
      app.callback()
    );

    server.listen(port);
  }

  serverLogger.info(`listening on port ${port}`);
})();
