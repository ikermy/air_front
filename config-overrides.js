const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');
const { override, overrideDevServer } = require('customize-cra');

const customWebpackConfig = (config, env) => {
  // Добавляем анализатор бандла только при наличии переменной окружения
  if (process.env.ANALYZE) {
    config.plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: true,
        reportFilename: 'bundle-report.html'
      })
    );
  }

  // Оптимизация для production
  if (env === 'production') {
    // Добавляем Gzip компрессию
    config.plugins.push(
      new CompressionPlugin({
        filename: '[path][base].gz',
        algorithm: 'gzip',
        test: /\.(js|css|html|svg)$/,
        threshold: 8192, // Только файлы > 8kb
        minRatio: 0.8,
      })
    );

    // Удаление console.log в production
    if (config.optimization.minimizer) {
      config.optimization.minimizer.forEach((plugin) => {
        if (plugin.constructor.name === 'TerserPlugin') {
          plugin.options.terserOptions = {
            ...plugin.options.terserOptions,
            compress: {
              ...plugin.options.terserOptions?.compress,
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
            },
          };
        }
      });
    }

    // Оптимизация модулей
    config.optimization.moduleIds = 'deterministic';
    config.optimization.usedExports = true;
    config.optimization.sideEffects = true;

    // Оптимизация splitChunks
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: 30,
        maxAsyncRequests: 30,
        minSize: 20000,
        maxSize: 244000, // Максимальный размер чанка ~244KB
        cacheGroups: {
          // React и React-DOM в отдельный чанк
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: 'react-vendor',
            priority: 40,
            reuseExistingChunk: true,
            enforce: true,
          },
          // Ant Design Core
          antdCore: {
            test: /[\\/]node_modules[\\/]antd[\\/]es[\\/](button|input|form|select|modal|message|notification|table|layout|menu|dropdown|card|tabs|tooltip|popover|checkbox|radio|switch|slider|pagination|spin|alert|badge|tag|divider|space|grid|avatar|list|tree|upload|progress|steps|breadcrumb|rate|collapse|carousel|anchor|back-top|drawer|statistic|descriptions|empty|result|skeleton|transfer|timeline|calendar|date-picker|time-picker|cascader|tree-select|auto-complete|input-number|mentions|config-provider|locale|_util)[\\/]/,
            name: 'antd-core',
            priority: 35,
            reuseExistingChunk: true,
          },
          // Ant Design Icons - очень большой пакет
          antdIcons: {
            test: /[\\/]node_modules[\\/]@ant-design[\\/]icons[\\/]/,
            name: 'antd-icons',
            priority: 34,
            reuseExistingChunk: true,
          },
          // Остальные компоненты Ant Design
          antdOther: {
            test: /[\\/]node_modules[\\/]antd[\\/]/,
            name: 'antd-other',
            priority: 33,
            reuseExistingChunk: true,
          },
          // React Router
          reactRouter: {
            test: /[\\/]node_modules[\\/](react-router|react-router-dom|@remix-run)[\\/]/,
            name: 'react-router',
            priority: 32,
            reuseExistingChunk: true,
          },
          // Axios
          axios: {
            test: /[\\/]node_modules[\\/]axios[\\/]/,
            name: 'axios',
            priority: 31,
            reuseExistingChunk: true,
          },
          // React Icons - тоже может быть большим
          reactIcons: {
            test: /[\\/]node_modules[\\/]react-icons[\\/]/,
            name(module) {
              // Разделяем react-icons на подпакеты
              const match = module.context.match(/react-icons[\\/]([\w]+)/);
              if (match) {
                return `react-icons-${match[1]}`;
              }
              return 'react-icons';
            },
            priority: 30,
            reuseExistingChunk: true,
          },
          // PDF библиотеки - большие, разделяем
          jspdf: {
            test: /[\\/]node_modules[\\/]jspdf[\\/]/,
            name: 'jspdf',
            priority: 29,
            reuseExistingChunk: true,
          },
          html2canvas: {
            test: /[\\/]node_modules[\\/]html2canvas[\\/]/,
            name: 'html2canvas',
            priority: 28,
            reuseExistingChunk: true,
          },
          jspdfAutotable: {
            test: /[\\/]node_modules[\\/]jspdf-autotable[\\/]/,
            name: 'jspdf-autotable',
            priority: 27,
            reuseExistingChunk: true,
          },
          // i18next
          i18next: {
            test: /[\\/]node_modules[\\/]i18next[\\/]/,
            name: 'i18next',
            priority: 26,
            reuseExistingChunk: true,
          },
          reactI18next: {
            test: /[\\/]node_modules[\\/]react-i18next[\\/]/,
            name: 'react-i18next',
            priority: 25,
            reuseExistingChunk: true,
          },
          i18nextDetector: {
            test: /[\\/]node_modules[\\/]i18next-browser-languagedetector[\\/]/,
            name: 'i18next-detector',
            priority: 24,
            reuseExistingChunk: true,
          },
          // Markdown и связанные библиотеки
          reactMarkdown: {
            test: /[\\/]node_modules[\\/]react-markdown[\\/]/,
            name: 'react-markdown',
            priority: 23,
            reuseExistingChunk: true,
          },
          remarkRehype: {
            test: /[\\/]node_modules[\\/](remark-|rehype-|unist-|unified|vfile|micromark)[\\/]/,
            name: 'remark-rehype',
            priority: 22,
            reuseExistingChunk: true,
          },
          // Crypto
          crypto: {
            test: /[\\/]node_modules[\\/]crypto-js[\\/]/,
            name: 'crypto',
            priority: 21,
            reuseExistingChunk: true,
          },
          // @react-spring
          reactSpring: {
            test: /[\\/]node_modules[\\/]@react-spring[\\/]/,
            name: 'react-spring',
            priority: 20,
            reuseExistingChunk: true,
          },
          // Остальные node_modules - разбиваем на более мелкие части
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              // Получаем имя пакета
              const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
              // Заменяем @ и / на безопасные символы
              return `vendor-${packageName.replace('@', '').replace(/[\\/]/g, '-')}`;
            },
            priority: 10,
            reuseExistingChunk: true,
            minSize: 10000,
            maxSize: 200000,
          },
          // Общий код приложения
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
            minSize: 10000,
          },
        },
      },
      // Оптимизация runtime chunk
      runtimeChunk: {
        name: 'runtime',
      },
      // Минимизация
      minimize: true,
    };
  }

  return config;
};

const customDevServer = (config) => {
  // Заменяем устаревшую опцию 'https' на 'server'
  if (config.https) {
    const httpsConfig = config.https;
    delete config.https;
    config.server = {
      type: 'https',
      options: typeof httpsConfig === 'object' ? httpsConfig : {}
    };
  }

  // Заменяем устаревшие middleware опции на setupMiddlewares
  const onBeforeSetupMiddleware = config.onBeforeSetupMiddleware;
  const onAfterSetupMiddleware = config.onAfterSetupMiddleware;

  delete config.onBeforeSetupMiddleware;
  delete config.onAfterSetupMiddleware;

  config.setupMiddlewares = (middlewares, devServer) => {
    if (onBeforeSetupMiddleware) {
      onBeforeSetupMiddleware(devServer);
    }

    if (onAfterSetupMiddleware) {
      onAfterSetupMiddleware(devServer);
    }

    return middlewares;
  };

  config.proxy = {
    '/v1': {
      target: 'https://127.0.0.1:443',
      changeOrigin: true,
      secure: false,
      ws: true,      // Поддержка WebSocket
    },
  };

  return config;
};

module.exports = {
  webpack: override(
    // Ant Design 5.x поддерживает tree-shaking из коробки, babel-plugin-import не нужен
    customWebpackConfig
  ),
  devServer: overrideDevServer(customDevServer)
};

