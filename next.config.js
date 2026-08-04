/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["antd", "@ant-design/colors", "@ant-design/icons"],
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

module.exports = nextConfig;
