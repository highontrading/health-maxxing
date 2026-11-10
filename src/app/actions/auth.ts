"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, getSessionUser, destroyAllSessions } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { queryOne, run } from "@/lib/db";
import { limitByClient, rateLimit } from "@/lib/rate-limit";
import { hashPassword, verifyPassword } from "@/lib/security";
import type { FormState } from "./types";

const STICKERS = ["smile", "sun", "moon", "leaf", "bolt", "flower", "apple", "avocado", "sneaker", "lotus", "star", "cloud"];
const COLORS = ["lime", "orange", "indigo", "lilac", "pink", "yellow", "teal", "sky", "peach", "mint"];
const RESERVED = new Set(["admin", "team", "staff", "moderator", "mod", "support", "healthmaxxing", "official", "system", "root", "null", "undefined"]);

/** Only same-site paths are allowed as a post-login destination. */
function safeNext(value: FormDataEntryValue | null, fallback: string): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Tell us what to call you (2 characters or more).").max(40, "Keep it under 40 characters."),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, "3 to 20 letters, numbers or underscores."),
  email: z.string().trim().toLowerCase().email("That does not look like an email address.").max(200),
  password: z.string().min(8, "Use at least 8 characters.").max(200, "That is too long."),
});

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (String(formData.get("website") ?? "")) return { ok: true, message: "Thanks!" }; // honeypot
  const settings = await getSettings();
  if (!settings.community.signupsOpen) return { message: "New sign-ups are paused right now. Please check back soon." };
  if (!(await limitByClient("signup", 5, 3600))) return { message: "Too many attempts. Please try again in an hour." };

  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    handle: formData.get("handle"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
    return { errors };
  }
  const { name, handle, email, password } = parsed.data;
  if (RESERVED.has(handle)) return { errors: { handle: "That handle is reserved. Try another." } };
  if (formData.get("agree") !== "on") return { errors: { agree: "Please agree to the community guidelines to join." } };

  if (await queryOne("SELECT id FROM users WHERE handle = ?", [handle])) {
    return { errors: { handle: "That handle is taken." } };
  }
  if (await queryOne("SELECT id FROM users WHERE email = ?", [email])) {
    return { errors: { email: "An account with this email already exists. Try signing in." } };
  }

  const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
  const res = await run(
    "INSERT INTO users (email, handle, name, password_hash, role, sticker, color) VALUES (?, ?, ?, ?, 'member', ?, ?)",
    [email, handle, name, await hashPassword(password), pick(STICKERS), pick(COLORS)],
  );
  await createSession(res.lastId, (await headers()).get("user-agent") ?? "");
  redirect(safeNext(formData.get("next"), "/community"));
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const generic = { message: "That email and password do not match. Check them and try again." };
  if (!email || !password) return { message: "Enter your email and password." };

  if (!(await limitByClient("login", 12, 600)) || !(await rateLimit(`login-email:${email}`, 8, 600))) {
    return { message: "Too many attempts. Please wait ten minutes and try again." };
  }
  const user = await queryOne<{ id: number; password_hash: string; banned: number; role: string }>(
    "SELECT id, password_hash, banned, role FROM users WHERE email = ?",
    [email],
  );
  // Verify against a dummy hash when the user is unknown so timing does not reveal which emails exist.
  const hash =
    user?.password_hash ??
    "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
  const valid = await verifyPassword(password, hash);
  if (!user || !valid) return generic;
  if (user.banned) return { message: "This account has been suspended. Contact us if you think that is a mistake." };

  await createSession(user.id, (await headers()).get("user-agent") ?? "");
  const staff = user.role === "admin" || user.role === "editor";
  redirect(safeNext(formData.get("next"), staff && formData.get("area") === "admin" ? "/admin" : "/account"));
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters.").max(40, "Keep it under 40 characters."),
  bio: z.string().trim().max(280, "Keep your bio under 280 characters."),
  sticker: z.string().regex(/^[a-z-]{2,20}$/),
  color: z.string().regex(/^[a-z]{3,10}$/),
});

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { message: "Please sign in again." };
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    bio: formData.get("bio") ?? "",
    sticker: formData.get("sticker") ?? user.sticker,
    color: formData.get("color") ?? user.color,
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
    return { errors };
  }
  await run("UPDATE users SET name = ?, bio = ?, sticker = ?, color = ? WHERE id = ?", [
    parsed.data.name,
    parsed.data.bio,
    parsed.data.sticker,
    parsed.data.color,
    user.id,
  ]);
  return { ok: true, message: "Profile saved." };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { message: "Please sign in again." };
  if (!(await rateLimit(`pw:${user.id}`, 6, 3600))) return { message: "Too many attempts. Try again later." };
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const minimum = user.role === "member" ? 8 : 10;
  if (next.length < minimum) return { errors: { password: `Use at least ${minimum} characters.` } };
  if (next.length > 200) return { errors: { password: "That is too long." } };
  const row = await queryOne<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", [user.id]);
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    return { errors: { current: "Your current password is not right." } };
  }
  await run("UPDATE users SET password_hash = ? WHERE id = ?", [await hashPassword(next), user.id]);
  // Sign out other devices, keep this one.
  await destroyAllSessions(user.id);
  await createSession(user.id, (await headers()).get("user-agent") ?? "");
  return { ok: true, message: "Password changed. Other devices have been signed out." };
}
