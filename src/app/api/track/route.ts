import { NextResponse, type NextRequest } from "next/server";
import { run } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const TABLES = { article: "articles", condition: "conditions" } as const;

/** POST /api/track { kind, slug } — counts one view per visitor per page per half hour. */
export async function POST(request: NextRequest) {
  let body: { kind?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const kind = body.kind as keyof typeof TABLES;
  const slug = String(body.slug ?? "");
  if (!(kind in TABLES) || !/^[a-z0-9-]{1,100}$/.test(slug)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const ua = request.headers.get("user-agent") ?? "";
  if (/bot|crawl|spider|slurp|preview|monitor|headless/i.test(ua)) return NextResponse.json({ ok: true });

  const fresh = await rateLimit(`view:${kind}:${slug}:${await clientKey()}`, 1, 1800);
  if (fresh) {
    const day = new Date().toISOString().slice(0, 10);
    const res = await run(`UPDATE ${TABLES[kind]} SET views = views + 1 WHERE slug = ? AND status = 'published'`, [slug]);
    if (res.changes) {
      await run(
        "INSERT INTO daily_views (day, kind, slug, views) VALUES (?, ?, ?, 1) ON CONFLICT(day, kind, slug) DO UPDATE SET views = views + 1",
        [day, kind, slug],
      );
    }
  }
  return NextResponse.json({ ok: true });
}
