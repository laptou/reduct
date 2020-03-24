const path = require("path");

const HtmlPlugin = require("html-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");

/** @param {String} env If this is set to `"production"`, then additional optimization
 *  will be applied.
 *  @returns {import("webpack").Configuration} */
exports.default = (env) => ({
    context: __dirname,
    entry: ["./src/index.js"],
    devtool: env === "development" ? "eval-source-map" : false,
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
                            // cacheDirectory: true,
                        },
                    },
                    // {
                    //     loader: "eslint-loader",
                    //     options: {
                    //         // ESLint will not prevent you from building the project
                    //         // due to lint errors ... for now
                    //         emitWarning: true,
                    //     },
                    // },
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
        ...(env === "production"
            ? [
                new CompressionPlugin({
                    threshold: 8192,
                }),
            ]
            : []),
    ],
});
