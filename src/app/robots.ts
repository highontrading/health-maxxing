import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private or per-visitor pages have nothing for a search engine.
        disallow: ["/admin", "/api/", "/account", "/login", "/signup", "/forgot-password", "/reset-password", "/saved", "/search", "/community/new", "/newsletter/unsubscribe"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
