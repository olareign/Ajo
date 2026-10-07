import type { NextConfig } from "next";
import { staticSecurityHeaders } from "./src/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Which build is running, for Me and for support: the short commit on Vercel, "local" elsewhere.
  env: { NEXT_PUBLIC_APP_BUILD: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7) },
  // The welcome page lists public/people at request time, so the folder must travel with the server code.
  outputFileTracingIncludes: { "/": ["./public/people/**"] },
  async headers() {
    return [{ source: "/:path*", headers: staticSecurityHeaders() }];
  },
};

export default nextConfig;
