import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The domain package ships TypeScript source.
  transpilePackages: ["@ajo/domain"],
};

export default nextConfig;
