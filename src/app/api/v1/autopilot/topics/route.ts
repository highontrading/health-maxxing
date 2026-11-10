import { apiError, apiJson, authenticate, readJson } from "@/lib/api-auth";
import { addTopic, listTopics } from "@/lib/autopilot";

/** GET /api/v1/autopilot/topics — the queue and recent results. */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if ("response" in auth) return auth.response;
  return apiJson({ data: await listTopics(200) });
}

/** POST /api/v1/autopilot/topics { topic, category?, notes? } — queue a topic. */
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if ("response" in auth) return auth.response;
  const body = await readJson(request);
  if (!body) return apiError(400, "Send a JSON object.");
  const res = await addTopic({ topic: String(body.topic ?? ""), category: String(body.category ?? ""), notes: String(body.notes ?? "") }, `API (${auth.token.name})`);
  if (!res.ok) return apiError(422, res.message);
  return apiJson({ data: { id: res.id } }, 201);
}
