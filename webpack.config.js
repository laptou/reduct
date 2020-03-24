const path = require("path");

const HtmlPlugin = require("html-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");


/**
 * @typedef {Object} Env
 * @member {Boolean} development Whether we are running in a dev environment.
 * @member {Boolean} production Whether we are running in a prod environment.
 * @member {Boolean} analyze Whether to perform bundle size analysis.
 */

/** @param {Env} env Current environment.
 *  @returns {import("webpack").Configuration} */
exports.default = (env) => ({
    context: __dirname,
    entry: ["./src/index.js"],
    devtool: env.development ? "eval-source-map" : false,
    devServer: {
        port: 1234,
    },
    optimization: {
        runtimeChunk: false,
        splitChunks: {
            chunks: "all",
        },
    },
    output: {
        path: path.resolve(__dirname, "dist"),
    },
    module: {
        rules: [
            {
                test: /\.js$/i,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "babel-loader",
                        options: {
                            cacheDirectory: true,
                        },
                    },
                    {
                        loader: "eslint-loader",
                        options: {
                            // ESLint will not prevent you from building the project
                            // due to lint errors ... for now
                            emitWarning: true,
                        },
                    },
                ],
            },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.(mp3|mp4|ogg|opus|wav|png)$/i,
                use: ["file-loader"],
            },
        ],
    },
    plugins: [
        new HtmlPlugin({
            template: "index.html",
        }),
        ...(env.production
            ? [
                new CompressionPlugin({
                    threshold: 8192,
                }),
            ]
            : []),
        ...(env.analyze
            ? [
                new BundleAnalyzerPlugin(),
            ]
            : []),
    ],
    resolve: {
        alias: {
            "@resources": path.resolve(__dirname, "resources"),
        },
    },
});
