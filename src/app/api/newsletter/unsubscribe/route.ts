import { run } from "@/lib/db";

/**
 * POST /api/newsletter/unsubscribe?token=… — the one-click unsubscribe that
 * mail apps call (RFC 8058, the List-Unsubscribe-Post header). People who
 * click the link in the email go to /newsletter/unsubscribe instead.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return new Response("Invalid link", { status: 400 });
  await run("UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = ? WHERE token = ? AND status = 'active'", [new Date().toISOString(), token]);
  return new Response("Unsubscribed", { status: 200 });
}
