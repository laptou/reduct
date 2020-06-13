const webpack = require('webpack');
const path = require('path');

const HtmlPlugin = require('html-webpack-plugin');
const TsCheckerPlugin = require('fork-ts-checker-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const SriPlugin = require('webpack-subresource-integrity');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

/**
 * @typedef {Object} Env
 * @property {Boolean} development Whether we are running in a dev environment.
 * @property {Boolean} production Whether we are running in a prod environment.
 * @property {Boolean} analyze Whether to perform bundle size analysis.
 */

/** @param {Env} env Current environment.
 *  @returns {webpack.Configuration} */
exports.default = (env) => ({
  context: __dirname,
  entry: ['./src/index.js'],
  devtool: env.development ? 'source-map' : false,
  devServer: {
    port: 1234,
    hot: true
  },
  optimization: {
    runtimeChunk: false,
    splitChunks: {
      chunks: 'all'
    }
  },
  output: {
    path: path.resolve(__dirname, 'dist')
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
              cacheDirectory: true
            }
          }
        ]
      },
      {
        test: /\.css$/i,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              esModule: true,
              hmr: env.development
            }
          }, {
            loader: 'css-loader'
          }
        ]
      },
      {
        test: /\.scss$/i,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              esModule: true,
              hmr: env.development
            }
          }, 
          {
            loader: 'css-loader',
            options: {
              modules: false,
              localsConvention: 'camelCase',
              esModule: true
            }
          },
          {
            loader: 'resolve-url-loader'
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.(mp3|mp4|ogg|opus|wav|png)$/i,
        use: ['file-loader']
      }
    ]
  },
  plugins: [
    new HtmlPlugin({
      template: 'index.html'
    }),
    new MiniCssExtractPlugin(),
    // new TsCheckerPlugin({
    //     workers: TsCheckerPlugin.TWO_CPUS_FREE,

    //     // I don't have time to fix ESLint errors right now.
    //     // Who the fuck wrote so much unlintable code?!
    //     // - Ibiyemi Abiodun (iaa34)
    //     // eslint: true,
    // }),
    ...(env.production
      ? [
        new CompressionPlugin({
          threshold: 8192
        }),
        new SriPlugin({
          hashFuncNames: ['sha384', 'sha512']
        })
      ]
      : []),
    ...(env.analyze
      ? [
        new BundleAnalyzerPlugin()
      ]
      : []),
    ...(env.development
      ? [
        new webpack.HotModuleReplacementPlugin()
        /** eslint errors are currently so many that you can't
                 *  even see the more important errors
                 *  makes you wonder why they even included ESLint in this
                 *  project if they were going to completely ignore it and
                 *  write spaghetti code */
        // new EslintPlugin(),
      ]
      : [])
  ],
  resolve: {
    extensions: ['.ts', '.js', '.tsx', '.json'],
    alias: {
      '@resources': path.resolve(__dirname, 'resources/'),
      '@': path.resolve(__dirname, 'src/')
    }
  }
});
