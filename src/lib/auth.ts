/**
 * Sessions. A random token lives in an httpOnly cookie; only its SHA-256 is
 * stored. Reading the session uses cookies(), so callers must be inside a
 * <Suspense> boundary, a Server Action or a Route Handler.
 */
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { queryOne, run } from "./db";
import { randomToken, sha256 } from "./security";
import type { ColorKey, SessionUser } from "./types";

export const SESSION_COOKIE = "hm_session";
const SESSION_DAYS = 30;

export async function createSession(userId: number, userAgent = ""): Promise<void> {
  const token = randomToken(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await run("INSERT INTO sessions (id, user_id, expires_at, user_agent) VALUES (?, ?, ?, ?)", [
    sha256(token),
    userId,
    expires.toISOString(),
    userAgent.slice(0, 200),
  ]);
  await run("UPDATE users SET last_seen_at = ? WHERE id = ?", [new Date().toISOString(), userId]);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await run("DELETE FROM sessions WHERE id = ?", [sha256(token)]);
  jar.delete(SESSION_COOKIE);
}

/** Sign a user out everywhere (used after a password change or a ban). */
export async function destroyAllSessions(userId: number): Promise<void> {
  await run("DELETE FROM sessions WHERE user_id = ?", [userId]);
}

type UserRow = {
  id: number;
  email: string;
  handle: string;
  name: string;
  role: string;
  sticker: string;
  color: string;
  banned: number;
};

/** The signed-in user, or null. Deduplicated per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await queryOne<UserRow>(
    `SELECT u.id, u.email, u.handle, u.name, u.role, u.sticker, u.color, u.banned
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`,
    [sha256(token), new Date().toISOString()],
  );
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    handle: row.handle,
    name: row.name,
    role: (["member", "editor", "admin"].includes(row.role) ? row.role : "member") as SessionUser["role"],
    sticker: row.sticker,
    color: row.color as ColorKey,
    banned: row.banned === 1,
  };
});

export const isStaff = (user: SessionUser | null): user is SessionUser =>
  !!user && !user.banned && (user.role === "admin" || user.role === "editor");

/** For member-only pages: send signed-out visitors to the login page. */
export async function requireUser(next = "/account"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** For the admin panel: editors and admins only. */
export async function requireStaff(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!isStaff(user)) redirect("/admin/login");
  return user;
}

/** For settings, users and tokens: admins only. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireStaff();
  if (user.role !== "admin") redirect("/admin?denied=1");
  return user;
}
