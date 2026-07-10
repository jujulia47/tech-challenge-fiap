import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  async rewrites() {
    // Dev-only: proxy the micro-frontend zones to their local ports so
    // /dashboard and /transactions are served by apps/dashboard (:3003) and
    // apps/transactions (:3002). In production the rewrites in
    // apps/shell/vercel.json handle this (pointing to the deployed zones).
    if (process.env.NODE_ENV !== "development") return [];
    return {
      beforeFiles: [
        { source: "/dashboard/:path*", destination: "http://localhost:3003/dashboard/:path*" },
        { source: "/transactions/:path*", destination: "http://localhost:3002/transactions/:path*" },
      ],
    };
  },
};

export default nextConfig;
