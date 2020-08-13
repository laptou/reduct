import Koa, { Context, DefaultState } from 'koa';
import KoaRouter from 'koa-router';
import KoaBodyParser from 'koa-bodyparser';

import { initializeProdServer } from './prod';
import { initializeDevServer } from './dev';
import { initializeAuth } from './auth';

(async () => {
  const server = new Koa();
  const router = new KoaRouter<DefaultState, Context>();

  if (process.env.NODE_ENV === 'development') {
    await initializeDevServer(server);
    console.log('initialized dev server');
  } else {
    initializeProdServer(server);
    console.log('initialized production server');
  }

  initializeAuth(server, router);
  console.log('initialized authentication');

  server.use(KoaBodyParser());
  server.use(router.routes());

  const port = process.env.PORT || 8080;
  server.listen(port);
  console.log(`listening on port ${port}`);
})();
