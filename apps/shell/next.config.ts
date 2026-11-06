import type { NextConfig } from "next";
import path from "path";
import { securityHeaders } from "@bytebank/utils/src/securityHeaders";
import { zoneRewrites } from "@bytebank/utils/src/zoneRewrites";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: [
    '@bytebank/auth',
    '@bytebank/bff',
    '@bytebank/core',
    '@bytebank/design-system',
    '@bytebank/infrastructure',
    '@bytebank/utils',
  ],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders(process.env.VERCEL_ENV === "production") }];
  },
  // The zones under the shell origin, with the hosts from variables: @bytebank/utils/src/zoneRewrites
  async rewrites() {
    return { beforeFiles: zoneRewrites(process.env) };
  },
};

export default nextConfig;
