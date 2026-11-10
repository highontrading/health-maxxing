"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { batch, queryOne, run } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import type { SessionUser } from "@/lib/types";
import { echo, type FormState } from "./types";

const URL_RE = /https?:\/\/\S+/gi;

async function member(): Promise<{ user: SessionUser } | { error: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in to post." };
  if (user.banned) return { error: "Your account is suspended, so you cannot post." };
  const settings = await getSettings();
  if (!settings.community.enabled && !isStaff(user)) return { error: "The community is closed for posting right now." };
  return { user };
}

/** Basic checks on user text. Returns an error message, or null when fine. */
async function checkBody(body: string, user: SessionUser, min: number): Promise<string | null> {
  if (body.length < min) return `Please write at least ${min} characters.`;
  if (body.length > 6000) return "That is too long. Please keep it under 6,000 characters.";
  const links = body.match(URL_RE)?.length ?? 0;
  if (links > 5) return "Please include no more than five links.";
  if (links > 0 && !isStaff(user)) {
    // Brand-new accounts cannot post links: the cheapest effective spam filter.
    const row = await queryOne<{ created_at: string }>("SELECT created_at FROM users WHERE id = ?", [user.id]);
    const ageHours = row ? (Date.now() - new Date(row.created_at).getTime()) / 3_600_000 : 0;
    if (ageHours < 24) return "New accounts cannot post links for the first 24 hours. Please describe the source instead.";
  }
  return null;
}

export async function createThreadAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echo(formData, ["title", "body", "board"]);
  const who = await member();
  if ("error" in who) return { message: who.error, values };
  const { user } = who;

  const title = String(formData.get("title") ?? "").trim().replace(/\s+/g, " ");
  const body = String(formData.get("body") ?? "").trim();
  const boardSlug = String(formData.get("board") ?? "");
  const errors: Record<string, string> = {};
  if (title.length < 8) errors.title = "Give your thread a title of at least 8 characters.";
  if (title.length > 140) errors.title = "Keep the title under 140 characters.";
  const bodyError = await checkBody(body, user, 20);
  if (bodyError) errors.body = bodyError;
  const board = await queryOne<{ id: number; slug: string }>("SELECT id, slug FROM forum_boards WHERE slug = ? AND status = 'published'", [boardSlug]);
  if (!board) errors.board = "Choose a board for your thread.";
  if (Object.keys(errors).length) return { errors, values };

  if (!isStaff(user) && !(await rateLimit(`thread:${user.id}`, 5, 3600))) {
    return { message: "You are starting threads very quickly. Please wait a while and try again.", values };
  }
  const now = new Date().toISOString();
  const res = await run(
    "INSERT INTO forum_threads (board_id, user_id, title, body, created_at, updated_at, last_post_at, last_post_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [board!.id, user.id, title, body, now, now, now, user.id],
  );
  redirect(`/community/t/${res.lastId}`);
}

export async function replyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echo(formData, ["body"]);
  const who = await member();
  if ("error" in who) return { message: who.error, values };
  const { user } = who;

  const threadId = Number(formData.get("threadId"));
  const body = String(formData.get("body") ?? "").trim();
  const thread = await queryOne<{ id: number; locked: number; hidden: number }>("SELECT id, locked, hidden FROM forum_threads WHERE id = ?", [threadId]);
  if (!thread || (thread.hidden && !isStaff(user))) return { message: "That thread no longer exists." };
  if (thread.locked && !isStaff(user)) return { message: "This thread is locked." };
  const bodyError = await checkBody(body, user, 2);
  if (bodyError) return { errors: { body: bodyError }, values };
  if (!isStaff(user) && !(await rateLimit(`reply:${user.id}`, 20, 3600))) {
    return { message: "You are replying very quickly. Please wait a little and try again.", values };
  }
  const now = new Date().toISOString();
  await batch([
    { sql: "INSERT INTO forum_posts (thread_id, user_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", args: [threadId, user.id, body, now, now] },
    {
      sql: "UPDATE forum_threads SET reply_count = (SELECT COUNT(*) FROM forum_posts WHERE thread_id = ? AND hidden = 0), last_post_at = ?, last_post_user_id = ? WHERE id = ?",
      args: [threadId, now, user.id, threadId],
    },
  ]);
  refresh();
  return { ok: true, message: "Reply posted." };
}

/** Toggle a like on a thread or a reply. */
export async function likeAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || user.banned) redirect("/login?next=/community");
  const type = formData.get("type") === "thread" ? "thread" : "post";
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  if (!(await rateLimit(`like:${user.id}`, 120, 3600))) return;
  const table = type === "thread" ? "forum_threads" : "forum_posts";
  if (!(await queryOne(`SELECT id FROM ${table} WHERE id = ? AND hidden = 0`, [id]))) return;

  const existing = await queryOne("SELECT 1 AS x FROM forum_likes WHERE user_id = ? AND target_type = ? AND target_id = ?", [user.id, type, id]);
  if (existing) {
    await run("DELETE FROM forum_likes WHERE user_id = ? AND target_type = ? AND target_id = ?", [user.id, type, id]);
  } else {
    await run("INSERT OR IGNORE INTO forum_likes (user_id, target_type, target_id) VALUES (?, ?, ?)", [user.id, type, id]);
  }
  await run(`UPDATE ${table} SET like_count = (SELECT COUNT(*) FROM forum_likes WHERE target_type = ? AND target_id = ?) WHERE id = ?`, [type, id, id]);
  refresh();
}

export async function reportAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { message: "Please sign in to report a post." };
  const type = formData.get("type") === "thread" ? "thread" : "post";
  const id = Number(formData.get("id"));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (!Number.isInteger(id) || id <= 0) return { message: "Something went wrong. Please try again." };
  if (!(await rateLimit(`report:${user.id}`, 10, 3600))) return { message: "You have sent a lot of reports. Please contact us instead." };
  const duplicate = await queryOne("SELECT id FROM reports WHERE target_type = ? AND target_id = ? AND reporter_id = ? AND status = 'open'", [type, id, user.id]);
  if (!duplicate) {
    await run("INSERT INTO reports (target_type, target_id, reporter_id, reason) VALUES (?, ?, ?, ?)", [type, id, user.id, reason]);
  }
  return { ok: true, message: "Thanks. A moderator will take a look." };
}

/** Authors can remove their own reply; moderators can remove any. */
export async function deleteOwnPostAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const id = Number(formData.get("id"));
  const post = await queryOne<{ id: number; user_id: number; thread_id: number }>("SELECT id, user_id, thread_id FROM forum_posts WHERE id = ?", [id]);
  if (!post || (post.user_id !== user.id && !isStaff(user))) return;
  await batch([
    { sql: "DELETE FROM forum_posts WHERE id = ?", args: [id] },
    { sql: "DELETE FROM forum_likes WHERE target_type = 'post' AND target_id = ?", args: [id] },
    { sql: "UPDATE forum_threads SET reply_count = (SELECT COUNT(*) FROM forum_posts WHERE thread_id = ? AND hidden = 0) WHERE id = ?", args: [post.thread_id, post.thread_id] },
  ]);
  refresh();
}
