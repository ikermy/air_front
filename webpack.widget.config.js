const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: './src/widget/widget-entrypoint.js', // Используем полноценную React версию
  output: {
    path: path.resolve(__dirname, 'build/widget'),
    filename: 'marusya-widget.js'
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
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx'],
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
      'process.env.NODE_ENV': JSON.stringify('production')
    })
  ]
};
