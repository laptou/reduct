declare module '@reduct/client/webpack.config' {
  import Webpack from 'webpack';

  const configFactory: Webpack.ConfigurationFactory;
  export = configFactory;
}
