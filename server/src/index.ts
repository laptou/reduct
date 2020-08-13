import Koa, { Context, DefaultState } from 'koa';
import KoaRouter from 'koa-router';
import KoaBodyParser from 'koa-bodyparser';

import { initializeDevServer } from './dev';
import { initializeAuth } from './auth';

(async () => {
  const server = new Koa();
  const router = new KoaRouter<DefaultState, Context>();

  initializeAuth(server, router);
  await initializeDevServer(server);

  router.get(
    '/',
    ctx => {
      ctx.response.body = `welcome ${JSON.stringify(ctx.state.user)}`;
    }
  );

  server.use(KoaBodyParser());
  server.use(router.routes());
  server.listen(process.env.PORT || 8080);
})();
