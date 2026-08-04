/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["antd", "@ant-design/colors", "@ant-design/icons"],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    if (process.env.NODE_ENV === "production") return [];
    return [{ source: "/v1/:path*", destination: "/api/backend/v1/:path*" },
      { source: "/track-visitor", destination: "/api/backend/track-visitor" }];
  },
};

module.exports = nextConfig;
