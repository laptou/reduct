const webpack = require('webpack');
const path = require('path');
const SentryCliPlugin = require('@sentry/webpack-plugin');
const HtmlPlugin = require('html-webpack-plugin');
const TsCheckerPlugin = require('fork-ts-checker-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const SriPlugin = require('webpack-subresource-integrity');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { DefinePlugin } = require('webpack');
const PnpWebpackPlugin = require(`pnp-webpack-plugin`);

/**
 * @typedef {Object} Env
 * @property {Boolean} development Whether we are running in a dev environment.
 * @property {Boolean} production Whether we are running in a prod environment.
 * @property {Boolean} analyze Whether to perform bundle size analysis.
 */

/** @param {Env} env Current environment.
 *  @returns {webpack.Configuration} */
module.exports = (env) => ({
  context: path.resolve(__dirname),
  entry: ['react-hot-loader/patch', './src/index.ts'],
  devtool: env.development ? 'eval-source-map' : 'source-map',
  devServer: {
    port: 1234,
    hot: true,
  },
  optimization: {
    runtimeChunk: false,
    splitChunks: {
      chunks: 'all',
    },
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    crossOriginLoading: 'anonymous',
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.(tsx?|js)$/i,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
              presets: [
                [
                  require('@babel/preset-env'),
                  {
                    modules: false,
                    // "targets": "> 0.25%, not dead",
                    targets: 'Chrome 78',
                    useBuiltIns: 'usage',
                    corejs: 3,
                    shippedProposals: true,
                  },
                ],
                [
                  require('@babel/preset-typescript'),
                  {
                    onlyRemoveTypeImports: true,
                  },
                ],
                [require('@babel/preset-react')],
              ],
              plugins: [
                require('@babel/plugin-proposal-optional-chaining'),
                require('@babel/plugin-proposal-class-properties'),
                require('@babel/plugin-proposal-object-rest-spread'),
                require('react-hot-loader/babel'),
                // JSX line numbers should not be included in production mode
                ...(env.development ? [require('@babel/plugin-transform-react-jsx-source')] : []),
              ],
            },
          },
        ],
      },
      {
        test: /\.css$/i,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              esModule: true,
              hmr: env.development,
            },
          }, {
            loader: 'css-loader',
          },
        ],
      },
      {
        test: /\.scss$/i,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              esModule: true,
              hmr: env.development,
            },
          },
          {
            loader: 'css-loader',
            options: {
              modules: false,
              localsConvention: 'camelCase',
              esModule: true,
            },
          },
          {
            loader: 'resolve-url-loader',
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      },
      {
        test: /\.(mp3|mp4|ogg|opus|wav|png|svg)$/i,
        use: ['file-loader'],
      },
      {
        test: /\.(md)$/i,
        use: ['frontmatter-markdown-loader'],
      },
    ],
  },
  plugins: [
    new HtmlPlugin({
      template: 'index.html',
    }),
    new MiniCssExtractPlugin(),
    new DefinePlugin({
      'PKG_ENV': JSON.stringify(env.production ? 'production' : 'development'),
      'PKG_VERSION': JSON.stringify(require('./package.json').version),
      'process.env.NODE_ENV': JSON.stringify(env.production ? 'production' : 'development'),
    }),
    // new TsCheckerPlugin({
    //   workers: TsCheckerPlugin.TWO_CPUS_FREE,
    //   eslint: true,

    // }),
    ...(env.production
      ? [
        new CompressionPlugin({
          threshold: 8192,
        }),
        new SriPlugin({
          hashFuncNames: ['sha384', 'sha512'],
        }),
        new SentryCliPlugin({
          include: '.',
          ignoreFile: '.sentrycliignore',
          ignore: ['node_modules', 'webpack.config.js'],
        }),
      ]
      : []),
    ...(env.analyze
      ? [new BundleAnalyzerPlugin()]
      : []),
    ...(env.development
      ? [
        new webpack.HotModuleReplacementPlugin(),
        /** eslint errors are currently so many that you can't
                 *  even see the more important errors
                 *  makes you wonder why they even included ESLint in this
                 *  project if they were going to completely ignore it and
                 *  write spaghetti code */
        // new EslintPlugin(),
      ]
      : []),
  ],
  resolve: {
    extensions: [
      '.ts', '.js', '.tsx', '.json',
    ],
    alias: {
      '@resources': path.resolve(__dirname, 'resources/'),
      '@': path.resolve(__dirname, 'src/'),
      'react-dom$': '@hot-loader/react-dom',
    },
    plugins: [
      PnpWebpackPlugin,
    ],
  },
  resolveLoader: {
    plugins: [
      PnpWebpackPlugin.moduleLoader(module),
    ]
  }
});
