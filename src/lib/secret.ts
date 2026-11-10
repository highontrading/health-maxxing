/**
 * Application secret used to hash IP addresses for rate limiting.
 * Uses SESSION_SECRET when set; otherwise a random value stored in the database.
 */
import { queryOne, run } from "./db";
import { randomToken } from "./security";

let cached: string | undefined;

export async function appSecret(): Promise<string> {
  if (cached) return cached;
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    cached = process.env.SESSION_SECRET;
    return cached;
  }
  const row = await queryOne<{ value: string }>("SELECT value FROM meta WHERE key = 'app_secret'");
  if (row) {
    cached = row.value;
    return cached;
  }
  const generated = randomToken(32);
  await run("INSERT INTO meta (key, value) VALUES ('app_secret', ?) ON CONFLICT(key) DO NOTHING", [generated]);
  const stored = await queryOne<{ value: string }>("SELECT value FROM meta WHERE key = 'app_secret'");
  cached = stored?.value ?? generated;
  return cached;
}
