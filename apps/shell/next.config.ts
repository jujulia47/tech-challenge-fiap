import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/dashboard/:path*",
          destination: "http://localhost:3003/dashboard/:path*",
        },
        {
          source: "/transactions/:path*",
          destination: "http://localhost:3002/transactions/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
