import { getCollection } from "@/lib/admin/collections";
import { getRow, listRows, saveEntry, toEntry } from "@/lib/admin/store";
import { apiError, apiJson, authenticate, readJson } from "@/lib/api-auth";
import { invalidateFromRoute, type ContentTag } from "@/lib/cache-tags";

type Ctx = RouteContext<"/api/v1/[collection]">;

/** GET /api/v1/articles?q=sleep&status=draft&page=2 */
export async function GET(request: Request, ctx: Ctx) {
  const auth = await authenticate(request);
  if ("response" in auth) return auth.response;
  const def = getCollection((await ctx.params).collection);
  if (!def) return apiError(404, "No such collection. GET /api/v1 lists them.");
  const params = new URL(request.url).searchParams;
  const result = await listRows(def, {
    q: params.get("q") ?? "",
    status: params.get("status") ?? "",
    fact: params.get("fact") ?? "",
    topic: params.get("topic") ?? "",
    page: Number(params.get("page")) || 1,
  });
  return apiJson({ data: result.rows, total: result.total, page: result.page, pages: result.pages });
}

/** POST /api/v1/articles — create an entry. It is a draft unless status is "published". */
export async function POST(request: Request, ctx: Ctx) {
  const auth = await authenticate(request);
  if ("response" in auth) return auth.response;
  const def = getCollection((await ctx.params).collection);
  if (!def) return apiError(404, "No such collection. GET /api/v1 lists them.");
  const body = await readJson(request);
  if (!body) return apiError(400, "Send a JSON object.");
  const saved = await saveEntry({ def, id: null, raw: body, actor: `API (${auth.token.name})`, origin: "api" });
  if (!saved.ok) return apiError(422, saved.message ?? "Some fields are not valid.", saved.errors);
  invalidateFromRoute(...(def.tags as ContentTag[]));
  const row = await getRow(def, saved.id);
  return apiJson({ data: row ? toEntry(def, row) : { id: saved.id, slug: saved.slug } }, 201);
}
