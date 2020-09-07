import { resolve } from 'path';

import type { default as Koa } from 'koa';
import KoaStatic from 'koa-static';

import { serverLogger } from './logging/server';

export function initializeProdServer(server: Koa): void {
  const staticFileDir = resolve(__dirname, '../../client/dist');
  serverLogger.info(`serving production assets from ${staticFileDir}`);

  const staticMiddleware =
    KoaStatic(staticFileDir, { maxAge: 24 * 60 * 60 * 1000 });

  server.use(staticMiddleware);
}
