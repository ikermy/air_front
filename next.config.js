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
