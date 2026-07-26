const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: 'production',
    entry: './src/widget/widget-entrypoint.ts', // Используем полноценную React версию
    output: {
        path: path.resolve(__dirname, 'build/widget'),
        filename: 'marusya-widget.js',
        chunkFilename: '[id].[contenthash:8].chunk.js', // Имена для динамических чанков
        publicPath: '/widget/' // Путь для загрузки чанков
    },
    optimization: {
        splitChunks: {
            chunks: 'async', // Только для динамически загружаемых чанков (lazy)
            maxAsyncRequests: 30,
            minSize: 20000,
            maxSize: 244000,
        },
        minimize: true,
        usedExports: true,
        sideEffects: true,
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react']
                    }
                }
            },
            {
                test: /\.(ts|tsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            '@babel/preset-env',
                            '@babel/preset-react',
                            '@babel/preset-typescript'
                        ]
                    }
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg|webp)$/i,
                type: 'asset/resource',
                parser: {
                    dataUrlCondition: {
                        maxSize: 8 * 1024, // 8kb
                    },
                },
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        fallback: {
            "buffer": require.resolve("buffer/"),
            "process": require.resolve("process/browser.js"),
            "util": require.resolve("util/"),
            "stream": require.resolve("stream-browserify"),
            "crypto": false,
            "fs": false,
            "path": require.resolve("path-browserify")
        }
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser.js',
            Buffer: ['buffer', 'Buffer']
        }),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production'),
            'process.env.LAND_URL': JSON.stringify(process.env.LAND_URL || 'https://localhost')
        })
    ]
};
