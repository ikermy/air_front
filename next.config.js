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
