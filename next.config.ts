import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/v/:id",
        destination: "/verify/:id",
      },
      {
        source: "/receipt/:id",
        destination: "/verify/:id",
      },
      {
        source: "/r/:id",
        destination: "/verify/:id",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/v",
        destination: "/verify",
        permanent: true,
      },
      {
        source: "/receipt",
        destination: "/verify",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
