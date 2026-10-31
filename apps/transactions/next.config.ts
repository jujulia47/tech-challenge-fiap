import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: [
    '@bytebank/bff',
    '@bytebank/core',
    '@bytebank/design-system',
    '@bytebank/infrastructure',
    '@bytebank/store',
    '@bytebank/utils',
  ],
  basePath: "/transactions",
};

export default nextConfig;
