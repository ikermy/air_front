const path = require('path');
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    REACT_APP_SHOW_SIMPLE_AUTH: process.env.REACT_APP_SHOW_SIMPLE_AUTH ?? 'false',
  },
  transpilePackages: [
    "antd",
    "@ant-design/colors",
    "@ant-design/icons",
    "@ant-design/x",
    "@ant-design/x-markdown",
  ],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Карты исходников в прод-сборке: проект open-source (MIT), скрывать нечего,
  // а Lighthouse получает корректные привязки для аудитов бандла, и отладка
  // продовых чанков становится возможной. Карты грузятся только в devtools.
  productionBrowserSourceMaps: true,
  experimental: {
    // Лендинг (App Router) отдаёт два блокирующих отрисовку CSS-файла суммарно
    // ~14 KiB. Инлайним их в HTML: запросы исчезают из критического пути LCP/FCP.
    // Категория Pages Router (дашборд) приватная и не индексируется, поэтому
    // от неё инлайн не требуется.
    inlineCss: true,
  },
  webpack(config, { isServer, dev, webpack }) {
    // Next всегда вшивает свой polyfill-module (ES2019/ES2022-полифилы),
    // невзирая на browserslist. Для современных браузеров это мёртвый код,
    // который Lighthouse помечает как «Legacy JavaScript». Подменяем модуль
    // на пустую заглушку — только для клиентского продакшен-бандла.
    if (!isServer && !dev) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /next[\\/]dist[\\/]build[\\/]polyfills[\\/]polyfill-module/,
          path.resolve(__dirname, 'src/next-polyfill-shim.js'),
        ),
      );
    }
    return config;
  },
  // Лендинг статический и язык задаётся URL (localeDetection: false), поэтому
  // один URL = одна локаль и его можно безопасно кешировать на CDN.
  async headers() {
    const landingCache = [
      {
        key: 'Cache-Control',
        value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      },
    ];
    return [
      { source: '/', headers: landingCache },
      { source: '/:locale(ru|en|es)', headers: landingCache },
    ];
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];

    return {
      beforeFiles: [
        { source: "/v1/:path*", destination: "/api/backend/v1/:path*" },
      ],
    };
  }
};

module.exports = withNextIntl(nextConfig);
