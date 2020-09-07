import type { default as Koa } from 'koa';
import KoaWebpack from 'koa-webpack';
import Webpack from 'webpack';

const config = require('../../client/webpack.config') as Webpack.ConfigurationFactory;

export async function initializeDevServer(server: Koa): Promise<void> {
  const created = config({ env: 'development' }, {}) as Webpack.Configuration;
  const compiler = Webpack(created);
  const middleware = await KoaWebpack({ compiler });
  server.use(middleware);
}
