/**
 * Fixed-window rate limiting backed by the database, so it also works when
 * requests are spread across serverless instances.
 */
import "server-only";
import { headers } from "next/headers";
import { queryOne, run } from "./db";
import { appSecret } from "./secret";
import { sha256 } from "./security";

/** A stable, non-reversible identifier for the caller's network address. */
export async function clientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || "unknown";
  return sha256(`${await appSecret()}:${ip}`).slice(0, 24);
}

/**
 * Count one hit against `key`. Returns false once more than `limit` hits have
 * happened inside the current window of `windowSeconds`.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - windowSeconds;
  const row = await queryOne<{ count: number }>(
    `INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN window_start <= ? THEN 1 ELSE count + 1 END,
       window_start = CASE WHEN window_start <= ? THEN excluded.window_start ELSE window_start END
     RETURNING count`,
    [key, now, cutoff, cutoff],
  );
  // Opportunistic cleanup of long-expired windows.
  if (now % 50 === 0) await run("DELETE FROM rate_limits WHERE window_start < ?", [now - 86_400]);
  return (row?.count ?? 1) <= limit;
}

/** Rate limit by caller address and action name. */
export async function limitByClient(action: string, limit: number, windowSeconds: number): Promise<boolean> {
  return rateLimit(`${action}:${await clientKey()}`, limit, windowSeconds);
}
