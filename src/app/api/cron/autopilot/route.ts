import { apiJson, cronAuthorized } from "@/lib/api-auth";
import { runAutopilot } from "@/lib/autopilot";
import { invalidateFromRoute } from "@/lib/cache-tags";

// Drafting an article takes a few minutes.
export const maxDuration = 300;

/**
 * Scheduled autopilot run. Call it from any scheduler (cron, Vercel Cron,
 * GitHub Actions) with the header: Authorization: Bearer <CRON_SECRET>.
 */
async function handle(request: Request) {
  const auth = cronAuthorized(request);
  if ("response" in auth) return auth.response;
  const summary = await runAutopilot({ actor: "Autopilot (scheduled)" });
  if (summary.drafted) invalidateFromRoute("articles");
  return apiJson(summary);
}

export { handle as GET, handle as POST };
