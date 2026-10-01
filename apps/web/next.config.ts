import type { NextConfig } from "next";
import { staticSecurityHeaders } from "./src/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The welcome page lists public/people at request time, so the folder must travel with the server code.
  outputFileTracingIncludes: { "/": ["./public/people/**"] },
  async headers() {
    return [{ source: "/:path*", headers: staticSecurityHeaders() }];
  },
};

export default nextConfig;
