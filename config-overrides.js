module.exports = {
  webpack: function(config, env) {
    return config;
  },

  devServer: function(configFunction) {
    return function(proxy, allowedHost) {
      const config = configFunction(proxy, allowedHost);

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

      return config;
    };
  }
};

