import { apiJson, authenticate, readJson } from "@/lib/api-auth";
import { runAutopilot } from "@/lib/autopilot";
import { invalidateFromRoute } from "@/lib/cache-tags";

// Drafting an article takes a few minutes.
export const maxDuration = 300;

/** POST /api/v1/autopilot/run { max? } — draft queued topics now. */
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if ("response" in auth) return auth.response;
  const body = (await readJson(request)) ?? {};
  const summary = await runAutopilot({ max: Number(body.max) || undefined, actor: `API (${auth.token.name})` });
  if (summary.drafted) invalidateFromRoute("articles");
  return apiJson(summary);
}
