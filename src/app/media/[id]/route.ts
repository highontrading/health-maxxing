import { queryOne } from "@/lib/db";

/** GET /media/42 — an image uploaded through the admin panel. */
export async function GET(_request: Request, ctx: RouteContext<"/media/[id]">) {
  const { id } = await ctx.params;
  const row = /^\d{1,12}$/.test(id) ? await queryOne<{ mime: string; data: ArrayBuffer | Uint8Array }>("SELECT mime, data FROM media WHERE id = ?", [Number(id)]) : null;
  if (!row) return new Response("Not found", { status: 404 });
  const body = row.data instanceof Uint8Array ? row.data : new Uint8Array(row.data);
  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": row.mime,
      "Content-Length": String(body.byteLength),
      // Uploads never change once stored: each new upload gets a new id.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
