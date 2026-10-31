import type { NextConfig } from "next";
import path from "path";
import { securityHeaders } from "@bytebank/utils/src/securityHeaders";

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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders(process.env.VERCEL_ENV === "production") }];
  },
};

export default nextConfig;
