import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "./"),
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
