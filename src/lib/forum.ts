/**
 * Community forum reads. These are never cached: forum pages render per
 * request inside <Suspense>, so members always see current threads.
 */
import "server-only";
import { query, queryOne } from "./db";
import type { ColorKey } from "./types";

export type ForumAuthor = { id: number; name: string; handle: string; role: string; sticker: string; color: ColorKey };

export type ForumBoard = {
  id: number;
  slug: string;
  name: string;
  description: string;
  sticker: string;
  color: ColorKey;
  threadCount: number;
  latest: { id: number; title: string; at: string } | null;
};

export type ForumThread = {
  id: number;
  boardId: number;
  boardSlug: string;
  boardName: string;
  boardColor: ColorKey;
  title: string;
  body: string;
  pinned: boolean;
  locked: boolean;
  hidden: boolean;
  replyCount: number;
  likeCount: number;
  views: number;
  createdAt: string;
  lastPostAt: string;
  author: ForumAuthor;
};

export type ForumPost = {
  id: number;
  threadId: number;
  body: string;
  hidden: boolean;
  likeCount: number;
  createdAt: string;
  author: ForumAuthor;
  liked: boolean;
};

type R = Record<string, unknown>;
const s = (v: unknown) => (v == null ? "" : String(v));
const n = (v: unknown) => Number(v) || 0;

const AUTHOR_COLS = "u.id AS author_id, u.name AS author_name, u.handle AS author_handle, u.role AS author_role, u.sticker AS author_sticker, u.color AS author_color";
const author = (r: R): ForumAuthor => ({
  id: n(r.author_id),
  name: s(r.author_name),
  handle: s(r.author_handle),
  role: s(r.author_role),
  sticker: s(r.author_sticker) || "smile",
  color: (s(r.author_color) || "lime") as ColorKey,
});

const THREAD_COLS = `t.id, t.board_id, t.title, t.body, t.pinned, t.locked, t.hidden, t.reply_count, t.like_count, t.views, t.created_at, t.last_post_at,
  b.slug AS board_slug, b.name AS board_name, b.color AS board_color, ${AUTHOR_COLS}`;
const THREAD_FROM = "FROM forum_threads t JOIN forum_boards b ON b.id = t.board_id JOIN users u ON u.id = t.user_id";

function toThread(r: R): ForumThread {
  return {
    id: n(r.id),
    boardId: n(r.board_id),
    boardSlug: s(r.board_slug),
    boardName: s(r.board_name),
    boardColor: (s(r.board_color) || "sand") as ColorKey,
    title: s(r.title),
    body: s(r.body),
    pinned: n(r.pinned) === 1,
    locked: n(r.locked) === 1,
    hidden: n(r.hidden) === 1,
    replyCount: n(r.reply_count),
    likeCount: n(r.like_count),
    views: n(r.views),
    createdAt: s(r.created_at),
    lastPostAt: s(r.last_post_at),
    author: author(r),
  };
}

export async function listBoards(): Promise<ForumBoard[]> {
  const rows = await query<R>(
    `SELECT b.id, b.slug, b.name, b.description, b.sticker, b.color,
       (SELECT COUNT(*) FROM forum_threads t WHERE t.board_id = b.id AND t.hidden = 0) AS thread_count,
       (SELECT t.id FROM forum_threads t WHERE t.board_id = b.id AND t.hidden = 0 ORDER BY t.last_post_at DESC LIMIT 1) AS latest_id,
       (SELECT t.title FROM forum_threads t WHERE t.board_id = b.id AND t.hidden = 0 ORDER BY t.last_post_at DESC LIMIT 1) AS latest_title,
       (SELECT t.last_post_at FROM forum_threads t WHERE t.board_id = b.id AND t.hidden = 0 ORDER BY t.last_post_at DESC LIMIT 1) AS latest_at
     FROM forum_boards b WHERE b.status = 'published' ORDER BY b.sort_order, b.name`,
  );
  return rows.map((r) => ({
    id: n(r.id),
    slug: s(r.slug),
    name: s(r.name),
    description: s(r.description),
    sticker: s(r.sticker),
    color: (s(r.color) || "sand") as ColorKey,
    threadCount: n(r.thread_count),
    latest: r.latest_id ? { id: n(r.latest_id), title: s(r.latest_title), at: s(r.latest_at) } : null,
  }));
}

export async function getBoard(slug: string): Promise<{ id: number; slug: string; name: string; description: string; sticker: string; color: ColorKey } | null> {
  const r = await queryOne<R>("SELECT id, slug, name, description, sticker, color FROM forum_boards WHERE slug = ? AND status = 'published'", [slug]);
  return r ? { id: n(r.id), slug: s(r.slug), name: s(r.name), description: s(r.description), sticker: s(r.sticker), color: (s(r.color) || "sand") as ColorKey } : null;
}

export const THREADS_PER_PAGE = 20;

export async function listThreads(opts: { boardId?: number; page?: number; limit?: number; includeHidden?: boolean } = {}): Promise<{ threads: ForumThread[]; total: number }> {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (opts.boardId) {
    where.push("t.board_id = ?");
    args.push(opts.boardId);
  }
  if (!opts.includeHidden) where.push("t.hidden = 0");
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limit = opts.limit ?? THREADS_PER_PAGE;
  const offset = (Math.max(1, opts.page ?? 1) - 1) * limit;
  const [rows, count] = await Promise.all([
    query<R>(
      `SELECT ${THREAD_COLS} ${THREAD_FROM} ${clause} ORDER BY ${opts.boardId ? "t.pinned DESC, " : ""}t.last_post_at DESC LIMIT ? OFFSET ?`,
      [...args, limit, offset],
    ),
    queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM forum_threads t ${clause}`, args),
  ]);
  return { threads: rows.map(toThread), total: count?.n ?? 0 };
}

export async function getThread(id: number): Promise<ForumThread | null> {
  const r = await queryOne<R>(`SELECT ${THREAD_COLS} ${THREAD_FROM} WHERE t.id = ?`, [id]);
  return r ? toThread(r) : null;
}

export async function listPosts(threadId: number, viewerId: number | null, includeHidden = false): Promise<ForumPost[]> {
  const rows = await query<R>(
    `SELECT p.id, p.thread_id, p.body, p.hidden, p.like_count, p.created_at, ${AUTHOR_COLS},
       ${viewerId ? "(SELECT 1 FROM forum_likes l WHERE l.user_id = ? AND l.target_type = 'post' AND l.target_id = p.id)" : "0"} AS liked
     FROM forum_posts p JOIN users u ON u.id = p.user_id
     WHERE p.thread_id = ? ${includeHidden ? "" : "AND p.hidden = 0"} ORDER BY p.created_at ASC, p.id ASC LIMIT 500`,
    viewerId ? [viewerId, threadId] : [threadId],
  );
  return rows.map((r) => ({
    id: n(r.id),
    threadId: n(r.thread_id),
    body: s(r.body),
    hidden: n(r.hidden) === 1,
    likeCount: n(r.like_count),
    createdAt: s(r.created_at),
    author: author(r),
    liked: n(r.liked) === 1,
  }));
}

export async function hasLiked(userId: number, type: "thread" | "post", id: number): Promise<boolean> {
  return !!(await queryOne("SELECT 1 AS x FROM forum_likes WHERE user_id = ? AND target_type = ? AND target_id = ?", [userId, type, id]));
}

export async function forumStats(): Promise<{ members: number; threads: number; posts: number }> {
  const r = await queryOne<R>(
    `SELECT (SELECT COUNT(*) FROM users WHERE banned = 0 AND password_hash != '!disabled') AS members,
            (SELECT COUNT(*) FROM forum_threads WHERE hidden = 0) AS threads,
            (SELECT COUNT(*) FROM forum_posts WHERE hidden = 0) AS posts`,
  );
  return { members: n(r?.members), threads: n(r?.threads), posts: n(r?.posts) };
}

/** "3 hours ago" style label. `now` is passed in so callers control the clock. */
export function timeAgo(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const sec = Math.max(0, Math.round((now - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} ${hr === 1 ? "hour" : "hours"} ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} ${day === 1 ? "day" : "days"} ago`;
  const month = Math.round(day / 30);
  if (month < 12) return `${month} ${month === 1 ? "month" : "months"} ago`;
  const year = Math.round(day / 365);
  return `${year} ${year === 1 ? "year" : "years"} ago`;
}
