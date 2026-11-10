import { COLLECTIONS } from "@/lib/admin/collections";
import { apiJson, authenticate } from "@/lib/api-auth";

/** GET /api/v1 — what this API offers, for scripts and agents discovering it. */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if ("response" in auth) return auth.response;
  return apiJson({
    name: "Health Maxxing content API",
    auth: "Authorization: Bearer <token>",
    collections: COLLECTIONS.map((c) => ({
      key: c.key,
      name: c.plural,
      list: `GET /api/v1/${c.key}?q=&status=published|draft${c.factCheck ? "&fact=pending|verified" : ""}${c.topicColumn ? "&topic=<slug>" : ""}&page=1`,
      create: `POST /api/v1/${c.key}`,
      item: `GET | PATCH | DELETE /api/v1/${c.key}/<id or slug>`,
      fields: c.fields.map((f) => ({ name: f.name, type: f.type, required: !!f.required, ...(f.options ? { options: f.options.map((o) => o.value) } : {}) })),
    })),
    autopilot: {
      topics: "GET | POST /api/v1/autopilot/topics  { topic, category?, notes? }",
      run: "POST /api/v1/autopilot/run  { max? }",
    },
    notes: [
      "New entries are drafts unless you send status: \"published\".",
      "List fields (tags, takeaways, symptoms…) take JSON arrays; sources take [{ title, publisher, url, year? }].",
      "PATCH changes only the fields you send.",
    ],
  });
}
