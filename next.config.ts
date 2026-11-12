import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // Only honoured over HTTPS, so it is harmless in local development.
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=63072000" }] : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Ship the database file made during the build with the server code. A host with a read-only
  // disk and no DATABASE_URL (Vercel without storage) then runs on a temporary copy of it (src/lib/db.ts).
  // Only the database: never admin-credentials.txt.
  outputFileTracingIncludes: {
    "/**": ["./data/health-maxxing.db", "./data/health-maxxing.db-wal"],
  },
  experimental: {
    // Image uploads in the admin panel go through a Server Action (4 MB limit plus form overhead).
    serverActions: { bodySizeLimit: "5mb" },
    // Turbopack's disk cache has served an out-of-date stylesheet twice here: to a build after a
    // CSS-only change, and to a dev server that restored a cache from before the change. So builds
    // and dev servers always start clean. The price: a dev server cannot release memory without that
    // cache, and a very busy session grew past 11 GB, so restart a dev server that has run for hours.
    turbopackFileSystemCacheForBuild: false,
    turbopackFileSystemCacheForDev: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
