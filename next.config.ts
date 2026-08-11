import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mastra and its deps must run on the Node server, not be bundled by Next.
  // This avoids "Module not found" / ESM bundling errors when agents are
  // imported inside API route handlers.
  serverExternalPackages: ["@mastra/core", "@mastra/loggers"],
};

export default nextConfig;
