import { getCollection, type CollectionDef } from "@/lib/admin/collections";
import { deleteEntry, getRow, getRowBySlug, saveEntry, toEntry, type Row } from "@/lib/admin/store";
import { apiError, apiJson, authenticate, readJson, type ApiToken } from "@/lib/api-auth";
import { invalidateFromRoute, type ContentTag } from "@/lib/cache-tags";

type Ctx = RouteContext<"/api/v1/[collection]/[id]">;

/** Authenticate, then find the row by numeric id or by slug. */
async function locate(request: Request, ctx: Ctx): Promise<{ response: Response } | { def: CollectionDef; row: Row; token: ApiToken }> {
  const auth = await authenticate(request);
  if ("response" in auth) return auth;
  const { collection, id } = await ctx.params;
  const def = getCollection(collection);
  if (!def) return { response: apiError(404, "No such collection. GET /api/v1 lists them.") };
  const row = /^\d+$/.test(id) ? await getRow(def, Number(id)) : await getRowBySlug(def, id);
  if (!row) return { response: apiError(404, `No ${def.singular} with that id or slug.`) };
  return { def, row, token: auth.token };
}

export async function GET(request: Request, ctx: Ctx) {
  const found = await locate(request, ctx);
  if ("response" in found) return found.response;
  return apiJson({ data: toEntry(found.def, found.row) });
}

/** PATCH changes only the fields that are sent. */
export async function PATCH(request: Request, ctx: Ctx) {
  const found = await locate(request, ctx);
  if ("response" in found) return found.response;
  const body = await readJson(request);
  if (!body) return apiError(400, "Send a JSON object.");
  const { def, row, token } = found;
  const saved = await saveEntry({ def, id: Number(row.id), raw: body, actor: `API (${token.name})`, partial: true, origin: "api" });
  if (!saved.ok) return apiError(422, saved.message ?? "Some fields are not valid.", saved.errors);
  invalidateFromRoute(...(def.tags as ContentTag[]));
  const fresh = await getRow(def, saved.id);
  return apiJson({ data: fresh ? toEntry(def, fresh) : null });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const found = await locate(request, ctx);
  if ("response" in found) return found.response;
  const { def, row, token } = found;
  const res = await deleteEntry(def, Number(row.id), `API (${token.name})`);
  if (!res.ok) return apiError(409, res.message ?? "That could not be deleted.");
  invalidateFromRoute(...(def.tags as ContentTag[]));
  return apiJson({ deleted: true });
}
