import Koa from 'koa';
import KoaBodyParser from 'koa-bodyparser';

import { initializeAuth, authMiddleware } from './auth';
import { initializeDevServer } from './dev';
import { initializeProdServer } from './prod';


(async () => {
  const server = new Koa();

  // body parser MUST be initialized for auth middleware
  // to work correctly
  server.use(KoaBodyParser());

  initializeAuth(server);
  console.log('initialized authentication');

  // all middleware after this point will be authentication-gated
  server.use(authMiddleware);

  if (process.env.NODE_ENV === 'development') {
    await initializeDevServer(server);
    console.log('initialized dev server');
  } else {
    initializeProdServer(server);
    console.log('initialized production server');
  }

  const port = process.env.PORT || 8080;
  server.listen(port);
  console.log(`listening on port ${port}`);
})();
