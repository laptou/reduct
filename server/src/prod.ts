import { resolve } from 'path';

import type { default as Koa } from 'koa';
import KoaStatic from 'koa-static';

export function initializeProdServer(server: Koa) {
  const staticFileDir = resolve(__dirname, '../../client/dist');
  console.log(`serving production assets from ${staticFileDir}`);

  const staticMiddleware =
    KoaStatic(staticFileDir, { maxAge: 24 * 60 * 60 * 1000 });

  server.use(staticMiddleware);
}
