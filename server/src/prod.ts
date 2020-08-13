import { resolve } from 'path';

import type { default as Koa } from 'koa';
import KoaStatic from 'koa-static';
import KoaMount from 'koa-mount';

export function initializeProdServer(server: Koa) {
  const staticFileDir = resolve(__dirname, '../../client/dist');
  const staticServerPath = '/';
  console.log(`serving production assets from ${staticFileDir} at ${staticServerPath}`);

  const staticMiddleware =
    KoaStatic(staticFileDir, { maxAge: 24 * 60 * 60 * 1000 });
  const mountMiddleware =
    KoaMount(staticServerPath, staticMiddleware);

  server.use(mountMiddleware);
}
