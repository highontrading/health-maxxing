/**
 * Bearer-token auth for the content API (/api/v1). Tokens are created in the
 * admin panel; only their SHA-256 is stored.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { queryOne, run } from "./db";
import { rateLimit } from "./rate-limit";
import { sha256 } from "./security";

export type ApiToken = { id: number; name: string };

export function apiError(status: number, message: string, fields?: Record<string, string>): Response {
  return Response.json({ error: { message, ...(fields && Object.keys(fields).length ? { fields } : {}) } }, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiJson(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function bearer(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

/** Returns the token, or the error response to send back. */
export async function authenticate(request: Request): Promise<{ token: ApiToken } | { response: Response }> {
  const given = bearer(request);
  if (!given.startsWith("hm_")) return { response: apiError(401, "Send an API token as: Authorization: Bearer <token>. Create one under Admin > API tokens.") };
  const row = await queryOne<{ id: number; name: string }>("SELECT id, name FROM api_tokens WHERE token_hash = ? AND revoked = 0", [sha256(given)]);
  if (!row) return { response: apiError(401, "That API token is not valid or has been revoked.") };
  if (!(await rateLimit(`api:${row.id}`, 300, 60))) return { response: apiError(429, "Too many requests. The limit is 300 per minute per token.") };
  await run("UPDATE api_tokens SET last_used_at = ? WHERE id = ?", [new Date().toISOString(), row.id]);
  return { token: { id: row.id, name: row.name } };
}

/** Compare a shared secret without leaking how much of it matched. */
export function secretMatches(given: string, expected: string): boolean {
  if (!given || !expected) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function cronAuthorized(request: Request): { ok: true } | { response: Response } {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16) return { response: apiError(503, "Set CRON_SECRET (16 characters or more) on the server to enable scheduled runs.") };
  if (!secretMatches(bearer(request), secret)) return { response: apiError(401, "Send the cron secret as: Authorization: Bearer <CRON_SECRET>.") };
  return { ok: true };
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
