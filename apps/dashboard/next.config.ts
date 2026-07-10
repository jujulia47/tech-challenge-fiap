import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  basePath: "/dashboard",
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "http://localhost:3003/dashboard",
};

export default nextConfig;
