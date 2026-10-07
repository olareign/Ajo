import type { NextConfig } from "next";
import { staticSecurityHeaders } from "./src/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Next writes AGENTS.md and CLAUDE.md files into the app when it runs; this repo keeps its own.
  agentRules: false,
  async headers() {
    return [{ source: "/:path*", headers: staticSecurityHeaders() }];
  },
};

export default nextConfig;
