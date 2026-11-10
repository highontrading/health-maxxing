import { NextResponse, type NextRequest } from "next/server";
import { getSearchIndex } from "@/lib/data";
import { searchDocs } from "@/lib/search";

/** GET /api/search?q=protein — ranked hits across every content type. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 30, 60);
  if (q.trim().length < 2) return NextResponse.json({ q, hits: [] });
  const hits = searchDocs(await getSearchIndex(), q, limit).map((h) => ({ ...h, score: undefined }));
  return NextResponse.json({ q, hits }, { headers: { "Cache-Control": "public, max-age=60" } });
}
