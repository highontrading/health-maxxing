/** Site-wide constants that do not live in the database. */
export const SITE_NAME = "Health Maxxing";
export const SITE_TAGLINE = "Feel better, on purpose";

/** Canonical origin, without a trailing slash. Set NEXT_PUBLIC_SITE_URL in production. */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
