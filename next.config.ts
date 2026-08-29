import type { NextConfig } from "next";

// Supabase Storage host — derived from the public URL so it never drifts.
const supabaseHost = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://mncaepsshphhxaojlrwv.supabase.co",
).hostname;

const nextConfig: NextConfig = {
  // Pin the project root so Turbopack doesn't mistake a stray lockfile in a
  // parent folder (e.g. C:\Users\estie\package-lock.json) for the workspace root,
  // which broke 'tailwindcss' module resolution in dev.
  turbopack: {
    root: __dirname,
  },
  images: {
    // Owner-uploaded listing logos live in the public `listing-logos` bucket.
    // `search` is intentionally omitted so the `?v=` cache-buster is allowed.
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
