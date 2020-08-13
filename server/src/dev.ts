import type Koa from 'koa';
import KoaWebpack from 'koa-webpack';
import Webpack from 'webpack';

const config = require('../../client/webpack.config');

export async function initializeDevServer(server: Koa) {
  const created = config({ env: 'production' });

  const compiler = Webpack(created);
  const middleware = await KoaWebpack({ compiler });

  server.use(middleware);
}
