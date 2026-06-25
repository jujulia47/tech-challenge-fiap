import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/dashboard/:path*",
        destination: "http://localhost:3001/dashboard/:path*",
      },
      {
        source: "/transactions/:path*",
        destination: "http://localhost:3002/transactions/:path*",
      },
    ];
  },
};

export default nextConfig;
