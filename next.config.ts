import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root so Turbopack doesn't mistake a stray lockfile in a
  // parent folder (e.g. C:\Users\estie\package-lock.json) for the workspace root,
  // which broke 'tailwindcss' module resolution in dev.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
