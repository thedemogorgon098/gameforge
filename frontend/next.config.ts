import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin tracing to this app (a lockfile higher up the tree would otherwise be picked as the root).
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // Tree-shake icon and animation barrels so pages only ship what they import.
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
