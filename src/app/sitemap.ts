import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/data";
import { siteUrl } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

/** Pages that exist without a database row. */
const STATIC_PATHS = ["/", "/articles", "/topics", "/conditions", "/body", "/tools", "/exercises", "/foods", "/myths", "/glossary", "/newsletter", "/community", "/contact", "/stickers"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entries = await getSitemapEntries();
  return [
    ...STATIC_PATHS.map((path) => ({ url: `${base}${path === "/" ? "" : path}`, changeFrequency: "daily" as const, priority: path === "/" ? 1 : 0.7 })),
    ...TOOLS.map((tool) => ({ url: `${base}/tools/${tool.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...entries.map((entry) => ({
      url: `${base}${entry.path}`,
      lastModified: entry.updatedAt ?? undefined,
      changeFrequency: "weekly" as const,
      priority: entry.path.startsWith("/articles/") ? 0.8 : 0.6,
    })),
  ];
}
