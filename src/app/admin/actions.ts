"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { InStatement } from "@libsql/client";
import { echo, type FormState } from "@/app/actions/types";
import { logActivity } from "@/lib/activity";
import { getCollection } from "@/lib/admin/collections";
import { bulkUpdate, deleteEntry, saveEntry, type BulkOp } from "@/lib/admin/store";
import { destroyAllSessions, requireAdmin, requireStaff } from "@/lib/auth";
import { addTopic, removeTopic, requeueTopic, runAutopilot, suggestTopics } from "@/lib/autopilot";
import { invalidate, type ContentTag } from "@/lib/cache-tags";
import { batch, queryOne, run } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { sendIssue, sendTestIssue } from "@/lib/newsletter-send";
import { createResetLink } from "@/lib/password-reset";
import { randomToken, sha256 } from "@/lib/security";
import { AUTOPILOT_MODELS, DEFAULT_SETTINGS, SETTINGS_GROUPS, type SettingsGroup } from "@/lib/settings";

const now = () => new Date().toISOString();
const actorOf = (user: { name: string; handle: string }) => `${user.name} (@${user.handle})`;

/** Only ever send people back to a page inside the admin panel. */
function adminPath(value: FormDataEntryValue | null, fallback: string): string {
  const path = String(value ?? "");
  return path.startsWith("/admin") && !path.startsWith("//") && !path.includes("\\") ? path : fallback;
}

function withNotice(path: string, notice: string, kind: "ok" | "error" = "ok"): string {
  const [base, queryString = ""] = path.split("?");
  const params = new URLSearchParams(queryString);
  params.delete("notice");
  params.delete("error");
  params.set(kind === "ok" ? "notice" : "error", notice);
  return `${base}?${params.toString()}`;
}

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

export async function saveEntryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireStaff();
  const def = getCollection(String(formData.get("_collection") ?? ""));
  if (!def) return { message: "That kind of content does not exist." };
  const id = Number(formData.get("_id")) || null;

  // Echo everything back in full: a long article must survive a failed save.
  const raw: Record<string, unknown> = {};
  const values: Record<string, string> = {};
  for (const f of def.fields) {
    const v = formData.get(f.name);
    raw[f.name] = typeof v === "string" ? v : "";
    values[f.name] = f.type === "boolean" ? (v === "on" ? "on" : "off") : typeof v === "string" ? v : "";
  }

  const res = await saveEntry({ def, id, raw, actor: actorOf(user) });
  if (!res.ok) {
    const count = Object.keys(res.errors).length;
    return {
      errors: res.errors,
      values,
      message: res.message ?? (count === 1 ? "One field needs attention. Nothing was saved." : `${count} fields need attention. Nothing was saved.`),
    };
  }
  invalidate(...(def.tags as ContentTag[]));
  if (res.created) redirect(withNotice(`/admin/c/${def.key}/${res.id}`, `The ${def.singular} was created.`));
  refresh();
  return { ok: true, message: "Saved.", values: { ...values, slug: res.slug } };
}

export async function deleteEntryAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const def = getCollection(String(formData.get("_collection") ?? ""));
  if (!def) redirect("/admin");
  const id = Number(formData.get("_id"));
  const res = await deleteEntry(def, id, actorOf(user));
  if (!res.ok) redirect(withNotice(`/admin/c/${def.key}/${id}`, res.message ?? "That could not be deleted.", "error"));
  invalidate(...(def.tags as ContentTag[]));
  redirect(withNotice(`/admin/c/${def.key}`, `The ${def.singular} was deleted.`));
}

const BULK_OPS: BulkOp[] = ["publish", "draft", "verify", "unverify", "delete"];
const BULK_DONE: Record<BulkOp, string> = {
  publish: "published",
  draft: "moved to drafts",
  verify: "marked as verified",
  unverify: "marked as pending",
  delete: "deleted",
};

export async function bulkEntriesAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const def = getCollection(String(formData.get("_collection") ?? ""));
  if (!def) redirect("/admin");
  const back = adminPath(formData.get("_back"), `/admin/c/${def.key}`);
  const op = String(formData.get("op") ?? "") as BulkOp;
  const ids = formData.getAll("ids").map((v) => Number(v));
  if (!BULK_OPS.includes(op)) redirect(back);
  if (!ids.length) redirect(withNotice(back, "Tick at least one row first.", "error"));
  const { changed, skipped } = await bulkUpdate(def, ids, op, actorOf(user));
  invalidate(...(def.tags as ContentTag[]));
  if (skipped.length) redirect(withNotice(back, `${changed} ${BULK_DONE[op]}. ${skipped.length} skipped: ${skipped[0]}`, "error"));
  redirect(withNotice(back, `${changed} ${changed === 1 ? def.singular : def.plural.toLowerCase()} ${BULK_DONE[op]}.`));
}

/** Renders Markdown exactly as the public site will, for the editor preview. */
export async function previewMarkdownAction(source: string): Promise<{ html: string }> {
  await requireStaff();
  // The preview does not know how many sources there are, so every [^n] marker is shown.
  const { html } = renderMarkdown(String(source ?? "").slice(0, 200_000), { citations: 99 });
  return { html };
}

/* ------------------------------------------------------------------ */
/* Community moderation                                                */
/* ------------------------------------------------------------------ */

const recount = (threadId: number): InStatement => ({
  sql: "UPDATE forum_threads SET reply_count = (SELECT COUNT(*) FROM forum_posts WHERE thread_id = ? AND hidden = 0) WHERE id = ?",
  args: [threadId, threadId],
});

export async function moderateAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const type = formData.get("type") === "thread" ? "thread" : "post";
  const id = Number(formData.get("id"));
  const op = String(formData.get("op") ?? "");
  const back = adminPath(formData.get("_back"), "/admin/community");
  if (!Number.isInteger(id) || id <= 0) redirect(back);
  const closeReports: InStatement = {
    sql: "UPDATE reports SET status = 'resolved', resolved_at = ? WHERE target_type = ? AND target_id = ? AND status = 'open'",
    args: [now(), type, id],
  };

  if (type === "thread") {
    const thread = await queryOne<{ id: number; title: string }>("SELECT id, title FROM forum_threads WHERE id = ?", [id]);
    if (!thread) redirect(withNotice(back, "That thread no longer exists.", "error"));
    const flags: Record<string, string> = {
      hide: "hidden = 1",
      show: "hidden = 0",
      lock: "locked = 1",
      unlock: "locked = 0",
      pin: "pinned = 1",
      unpin: "pinned = 0",
    };
    if (flags[op]) {
      const statements: InStatement[] = [{ sql: `UPDATE forum_threads SET ${flags[op]}, updated_at = ? WHERE id = ?`, args: [now(), id] }];
      if (op === "hide") statements.push(closeReports);
      await batch(statements);
    } else if (op === "delete") {
      await batch([
        { sql: "DELETE FROM forum_likes WHERE target_type = 'post' AND target_id IN (SELECT id FROM forum_posts WHERE thread_id = ?)", args: [id] },
        { sql: "DELETE FROM forum_likes WHERE target_type = 'thread' AND target_id = ?", args: [id] },
        { sql: "DELETE FROM forum_posts WHERE thread_id = ?", args: [id] },
        { sql: "DELETE FROM forum_threads WHERE id = ?", args: [id] },
        closeReports,
      ]);
    } else redirect(back);
    await logActivity(actorOf(user), `thread ${op}`, "thread", id, thread.title);
  } else {
    const post = await queryOne<{ id: number; thread_id: number; body: string }>("SELECT id, thread_id, body FROM forum_posts WHERE id = ?", [id]);
    if (!post) redirect(withNotice(back, "That reply no longer exists.", "error"));
    if (op === "hide" || op === "show") {
      const statements: InStatement[] = [
        { sql: "UPDATE forum_posts SET hidden = ?, updated_at = ? WHERE id = ?", args: [op === "hide" ? 1 : 0, now(), id] },
        recount(post.thread_id),
      ];
      if (op === "hide") statements.push(closeReports);
      await batch(statements);
    } else if (op === "delete") {
      await batch([
        { sql: "DELETE FROM forum_likes WHERE target_type = 'post' AND target_id = ?", args: [id] },
        { sql: "DELETE FROM forum_posts WHERE id = ?", args: [id] },
        recount(post.thread_id),
        closeReports,
      ]);
    } else redirect(back);
    await logActivity(actorOf(user), `reply ${op}`, "post", id, post.body.slice(0, 80));
  }
  redirect(withNotice(back, "Done."));
}

export async function resolveReportAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const id = Number(formData.get("id"));
  const status = formData.get("op") === "dismiss" ? "dismissed" : "resolved";
  await run("UPDATE reports SET status = ?, resolved_at = ? WHERE id = ? AND status = 'open'", [status, now(), id]);
  await logActivity(actorOf(user), `report ${status}`, "report", id);
  redirect(withNotice(adminPath(formData.get("_back"), "/admin/community"), "Report closed."));
}

/* ------------------------------------------------------------------ */
/* Members                                                             */
/* ------------------------------------------------------------------ */

export async function userAction(formData: FormData): Promise<void> {
  const me = await requireStaff();
  const id = Number(formData.get("id"));
  const op = String(formData.get("op") ?? "");
  const back = adminPath(formData.get("_back"), "/admin/users");
  const target = await queryOne<{ id: number; handle: string; role: string; banned: number }>("SELECT id, handle, role, banned FROM users WHERE id = ?", [id]);
  if (!target) redirect(withNotice(back, "That member no longer exists.", "error"));
  if (target.id === me.id) redirect(withNotice(back, "You cannot change your own account here.", "error"));
  const targetIsStaff = target.role === "admin" || target.role === "editor";
  if (targetIsStaff && me.role !== "admin") redirect(withNotice(back, "Only an admin can change a staff account.", "error"));

  if (op === "ban" || op === "purge") {
    const statements: InStatement[] = [{ sql: "UPDATE users SET banned = 1 WHERE id = ?", args: [id] }];
    if (op === "purge") {
      statements.push(
        { sql: "UPDATE forum_posts SET hidden = 1 WHERE user_id = ?", args: [id] },
        { sql: "UPDATE forum_threads SET hidden = 1 WHERE user_id = ?", args: [id] },
        {
          sql: `UPDATE forum_threads SET reply_count = (SELECT COUNT(*) FROM forum_posts p WHERE p.thread_id = forum_threads.id AND p.hidden = 0)
                WHERE id IN (SELECT thread_id FROM forum_posts WHERE user_id = ?)`,
          args: [id],
        },
      );
    }
    await batch(statements);
    await destroyAllSessions(id);
  } else if (op === "unban") {
    await run("UPDATE users SET banned = 0 WHERE id = ?", [id]);
  } else if (op === "reset") {
    // For members who cannot get into their account: a one-time link to pass on to them.
    // Admins only, because whoever holds the link can take over the account.
    if (me.role !== "admin") redirect(withNotice(back, "Only an admin can create password reset links.", "error"));
    const link = await createResetLink(id);
    await logActivity(actorOf(me), "created a password reset link", "user", id, `@${target.handle}`);
    redirect(withNotice(back, `Send this link to @${target.handle}. It works once, for one hour: ${link}`));
  } else if (op === "role") {
    if (me.role !== "admin") redirect(withNotice(back, "Only an admin can change roles.", "error"));
    const role = String(formData.get("role") ?? "");
    if (!["member", "editor", "admin"].includes(role)) redirect(back);
    await run("UPDATE users SET role = ? WHERE id = ?", [role, id]);
    await destroyAllSessions(id);
    await logActivity(actorOf(me), "role changed", "user", id, `@${target.handle} is now ${role}`);
    redirect(withNotice(back, `@${target.handle} is now ${role === "member" ? "a member" : `an ${role}`}. They need to sign in again.`));
  } else redirect(back);

  await logActivity(actorOf(me), op === "unban" ? "unsuspended" : op === "purge" ? "suspended and hid posts" : "suspended", "user", id, `@${target.handle}`);
  redirect(withNotice(back, op === "unban" ? `@${target.handle} can post again.` : `@${target.handle} is suspended.`));
}

/* ------------------------------------------------------------------ */
/* Subscribers and messages                                            */
/* ------------------------------------------------------------------ */

export async function subscriberAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const id = Number(formData.get("id"));
  const op = String(formData.get("op") ?? "");
  const back = adminPath(formData.get("_back"), "/admin/subscribers");
  if (op === "remove") await run("DELETE FROM subscribers WHERE id = ?", [id]);
  else if (op === "unsubscribe") await run("UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = ? WHERE id = ?", [now(), id]);
  else redirect(back);
  await logActivity(actorOf(user), `subscriber ${op}`, "subscriber", id);
  redirect(withNotice(back, op === "remove" ? "Subscriber removed." : "Subscriber unsubscribed."));
}

export async function messageAction(formData: FormData): Promise<void> {
  await requireStaff();
  const id = Number(formData.get("id"));
  const op = String(formData.get("op") ?? "");
  const back = adminPath(formData.get("_back"), "/admin/messages");
  if (op === "delete") await run("DELETE FROM contact_messages WHERE id = ?", [id]);
  else if (["new", "read", "archived"].includes(op)) await run("UPDATE contact_messages SET status = ? WHERE id = ?", [op, id]);
  redirect(back);
}

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

const MAX_UPLOAD = 4 * 1024 * 1024;

/** Identify an image by its first bytes; the browser's claimed type is not trusted. */
function sniffImage(bytes: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(0, 4) === "GIF8") return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) return "image/avif";
  return null;
}

export async function uploadMediaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireStaff();
  const file = formData.get("file");
  const alt = String(formData.get("alt") ?? "").trim().slice(0, 200);
  if (!(file instanceof File) || file.size === 0) return { message: "Choose an image to upload." };
  if (file.size > MAX_UPLOAD) return { message: "That image is larger than 4 MB. Please resize or compress it first." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImage(bytes);
  if (!mime) return { message: "That file is not a PNG, JPEG, WebP, GIF or AVIF image." };
  const filename = (file.name || "image").replace(/[^\w.\- ]+/g, "").slice(0, 120) || "image";
  const res = await run("INSERT INTO media (filename, mime, size, alt, data) VALUES (?, ?, ?, ?, ?)", [filename, mime, bytes.length, alt, bytes]);
  await logActivity(actorOf(user), "uploaded", "media", res.lastId, filename);
  refresh();
  return { ok: true, message: "Uploaded.", values: { url: `/media/${res.lastId}`, alt } };
}

export async function deleteMediaAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const id = Number(formData.get("id"));
  const used = await queryOne<{ title: string }>("SELECT title FROM articles WHERE cover_image = ? LIMIT 1", [`/media/${id}`]);
  if (used) redirect(withNotice("/admin/media", `That image is the cover of “${used.title}”. Change the cover first.`, "error"));
  await run("DELETE FROM media WHERE id = ?", [id]);
  await logActivity(actorOf(user), "deleted", "media", id);
  redirect(withNotice("/admin/media", "Image deleted."));
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

const LINK_KEYS = new Set(["instagram", "x", "youtube", "tiktok", "threads", "linkedin"]);

export async function saveSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const errors: Record<string, string> = {};
  const next: Record<string, Record<string, unknown>> = {};
  // A form names the groups it contains, so the autopilot page can save only its own.
  const wanted = String(formData.get("_groups") ?? "").split(",");
  const groups = SETTINGS_GROUPS.filter((g) => wanted.includes(g));
  if (!groups.length) return { message: "Nothing to save." };

  for (const group of groups) {
    const defaults = DEFAULT_SETTINGS[group] as Record<string, unknown>;
    next[group] = {};
    for (const [key, fallback] of Object.entries(defaults)) {
      const name = `${group}.${key}`;
      const rawValue = formData.get(name);
      if (typeof fallback === "boolean") next[group][key] = rawValue === "on";
      else if (typeof fallback === "number") {
        const n = Number(rawValue);
        if (!Number.isFinite(n)) errors[name] = "Enter a number.";
        else next[group][key] = n;
      } else if (Array.isArray(fallback)) {
        next[group][key] = String(rawValue ?? "")
          .split("\n")
          .map((s) => s.trim().slice(0, 80))
          .filter(Boolean)
          .slice(0, 30);
      } else {
        const value = String(rawValue ?? "").replace(/\r\n?/g, "\n").trim();
        if (value.length > 2000) errors[name] = "Keep this under 2,000 characters.";
        else if (LINK_KEYS.has(key) && group === "social" && value && !/^https:\/\/\S+$/.test(value)) errors[name] = "Use a full link starting with https://";
        else if (name === "announcement.href" && value && !/^(\/[^/\s]\S*|\/|https:\/\/\S+)$/.test(value)) errors[name] = "Use a page on this site (like /newsletter) or a full https:// link.";
        else if (name === "site.contactEmail" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[name] = "That does not look like an email address.";
        else if (name === "autopilot.model" && !AUTOPILOT_MODELS.some((m) => m.id === value)) errors[name] = "Choose one of the listed models.";
        else if (name === "site.name" && !value) errors[name] = "The site needs a name.";
        else next[group][key] = value;
      }
    }
  }
  if (groups.includes("autopilot")) {
    const perRun = Number(next.autopilot?.perRun);
    if (!errors["autopilot.perRun"] && (!Number.isInteger(perRun) || perRun < 1 || perRun > 5)) errors["autopilot.perRun"] = "Choose a whole number from 1 to 5.";
  }

  const values: Record<string, string> = echo(formData, groups.flatMap((g) => Object.keys(DEFAULT_SETTINGS[g]).map((k) => `${g}.${k}`)));
  // Unticked checkboxes send nothing; record them so the form can show them unticked.
  for (const g of groups) {
    for (const [k, fallback] of Object.entries(DEFAULT_SETTINGS[g])) {
      if (typeof fallback === "boolean") values[`${g}.${k}`] = formData.get(`${g}.${k}`) === "on" ? "on" : "off";
    }
  }
  if (Object.keys(errors).length) return { errors, values, message: "Some settings need attention. Nothing was saved." };

  await batch(
    groups.map((group: SettingsGroup) => ({
      sql: "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      args: [group, JSON.stringify(next[group]), now()],
    })),
  );
  invalidate("settings");
  await logActivity(actorOf(user), "updated", "settings");
  refresh();
  return { ok: true, message: "Settings saved.", values };
}

/* ------------------------------------------------------------------ */
/* API tokens                                                          */
/* ------------------------------------------------------------------ */

export async function createTokenAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (name.length < 2) return { errors: { name: "Give the token a name, so you remember what uses it." } };
  const token = `hm_${randomToken(24)}`;
  await run("INSERT INTO api_tokens (name, token_hash, prefix) VALUES (?, ?, ?)", [name, sha256(token), token.slice(0, 10)]);
  await logActivity(actorOf(user), "created", "api token", "", name);
  refresh();
  return { ok: true, message: "Copy this token now. It is not shown again.", values: { token } };
}

export async function revokeTokenAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = Number(formData.get("id"));
  await run("UPDATE api_tokens SET revoked = 1 WHERE id = ?", [id]);
  await logActivity(actorOf(user), "revoked", "api token", id);
  redirect(withNotice("/admin/api", "Token revoked. Anything using it has lost access."));
}

/* ------------------------------------------------------------------ */
/* Autopilot                                                           */
/* ------------------------------------------------------------------ */

export async function addTopicAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const values = echo(formData, ["topic", "category", "notes"]);
  const res = await addTopic({ topic: values.topic ?? "", category: values.category ?? "", notes: values.notes ?? "" }, actorOf(user));
  if (!res.ok) return { errors: { topic: res.message }, values };
  refresh();
  return { ok: true, message: "Added to the queue." };
}

export async function topicAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const op = String(formData.get("op") ?? "");
  if (op === "remove") await removeTopic(id);
  else if (op === "requeue") await requeueTopic(id);
  redirect(withNotice("/admin/autopilot", op === "requeue" ? "Back in the queue." : "Removed."));
}

/** Drafts the next queued topic. This waits for Claude, so it can take a few minutes. */
export async function runAutopilotAction(): Promise<FormState> {
  const user = await requireAdmin();
  const summary = await runAutopilot({ max: 1, actor: actorOf(user) });
  if (summary.drafted) invalidate("articles");
  refresh();
  if (summary.drafted) {
    return { ok: true, message: "Draft written. It is at the top of the finished list below.", values: { articleId: String(summary.articleIds[0]) } };
  }
  return { message: summary.messages.join(" ") || "Nothing was drafted." };
}

export async function suggestTopicsAction(): Promise<FormState> {
  const user = await requireAdmin();
  try {
    const added = await suggestTopics(5, actorOf(user));
    refresh();
    return added ? { ok: true, message: `${added} ${added === 1 ? "topic" : "topics"} added to the queue. Remove any you do not want.` } : { message: "Claude did not return any usable topics. Try again." };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Could not suggest topics." };
  }
}

/* ------------------------------------------------------------------ */
/* Newsletter sending                                                  */
/* ------------------------------------------------------------------ */

export async function sendTestIssueAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const to = String(formData.get("to") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { errors: { to: "Enter the email address to send the test to." }, values: { to } };
  const res = await sendTestIssue(id, to);
  return { ok: res.ok, message: res.message, values: { to } };
}

/** Sends to everyone who has not had this issue yet. Long lists take several presses. */
export async function sendIssueAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const res = await sendIssue(Number(formData.get("id")), actorOf(user));
  refresh();
  return { ok: res.ok, message: res.message };
}
