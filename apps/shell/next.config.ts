import type { NextConfig } from "next";
import path from "path";

const DASHBOARD_URL = process.env.DASHBOARD_URL ?? "http://dashboard:3003";
const TRANSACTIONS_URL = process.env.TRANSACTIONS_URL ?? "http://transactions:3002";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/dashboard/:path*",
          destination: `${DASHBOARD_URL}/dashboard/:path*`,
        },
        {
          source: "/transactions/:path*",
          destination: `${TRANSACTIONS_URL}/transactions/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
