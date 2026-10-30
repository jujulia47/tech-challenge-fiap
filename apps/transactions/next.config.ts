import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ['@bytebank/design-system', '@bytebank/types', '@bytebank/utils'],
  basePath: "/transactions",
};

export default nextConfig;
