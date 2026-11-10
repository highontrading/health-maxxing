import { getCategories, getSettings, listArticles } from "@/lib/data";
import { siteUrl } from "@/lib/site";

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** GET /rss.xml — the 40 newest articles as an RSS 2.0 feed. */
export async function GET() {
  const [articles, categories, settings] = await Promise.all([listArticles({ limit: 40 }), getCategories(), getSettings()]);
  const base = siteUrl();
  const topic = new Map(categories.map((c) => [c.slug, c.name]));
  const items = articles
    .map((a) => {
      const url = `${base}/articles/${a.slug}`;
      return `    <item>
      <title>${xml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${xml(a.summary || a.dek)}</description>${a.publishedAt ? `\n      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>` : ""}${
        topic.get(a.category) ? `\n      <category>${xml(topic.get(a.category)!)}</category>` : ""
      }
    </item>`;
    })
    .join("\n");
  const newest = articles[0]?.publishedAt;
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(settings.site.name)}</title>
    <link>${base}</link>
    <description>${xml(settings.site.description)}</description>
    <language>en</language>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />${newest ? `\n    <lastBuildDate>${new Date(newest).toUTCString()}</lastBuildDate>` : ""}
${items}
  </channel>
</rss>
`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
