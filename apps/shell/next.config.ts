import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  async rewrites() {
    // Proxy the micro-frontend zones so /dashboard and /transactions are served
    // by apps/dashboard and apps/transactions under the shell origin. Enabled in
    // local dev (`next dev`) and in Docker builds (DOCKER=true, set in the shell
    // Dockerfile); on Vercel the rewrites in apps/shell/vercel.json handle this.
    if (process.env.NODE_ENV !== "development" && !process.env.DOCKER) return [];
    // Inside Docker the zones are reachable by service name (DASHBOARD_URL /
    // TRANSACTIONS_URL from the Dockerfile); locally they fall back to localhost.
    const dashboardUrl = process.env.DASHBOARD_URL ?? "http://localhost:3003";
    const transactionsUrl = process.env.TRANSACTIONS_URL ?? "http://localhost:3002";
    // Exact (bare) rules are required in addition to the wildcard: `/dashboard`
    // does not match `/dashboard/:path*`, and post-login lands on the bare path.
    return {
      beforeFiles: [
        { source: "/dashboard", destination: `${dashboardUrl}/dashboard` },
        { source: "/dashboard/:path*", destination: `${dashboardUrl}/dashboard/:path*` },
        { source: "/transactions", destination: `${transactionsUrl}/transactions` },
        { source: "/transactions/:path*", destination: `${transactionsUrl}/transactions/:path*` },
      ],
    };
  },
};

export default nextConfig;
