/**
 * Read-only queries for the admin screens. Uncached, staff-only data: callers
 * check the session first. Dates are computed in SQL so pages never read the
 * clock while rendering.
 */
import { cache } from "react";
import { query, queryOne } from "@/lib/db";

const n = (v: unknown) => Number(v ?? 0);

/* ------------------------------------------------------------------ */
/* Navigation badges                                                   */
/* ------------------------------------------------------------------ */

export type NavCounts = { openReports: number; newMessages: number; queuedTopics: number };

/** Asked for by the layout and by the dashboard; one query per request. */
export const getNavCounts = cache(async (): Promise<NavCounts> => {
  const r = await queryOne<Record<string, number>>(
    `SELECT (SELECT COUNT(*) FROM reports WHERE status = 'open') AS reports,
            (SELECT COUNT(*) FROM contact_messages WHERE status = 'new') AS messages,
            (SELECT COUNT(*) FROM autopilot_topics WHERE status = 'queued') AS topics`,
  );
  return { openReports: n(r?.reports), newMessages: n(r?.messages), queuedTopics: n(r?.topics) };
});

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export type DayPoint = { day: string; views: number };
export type TopItem = { kind: string; slug: string; title: string; views: number };
export type Dashboard = {
  range: number;
  totals: {
    articles: number;
    drafts: number;
    conditions: number;
    members: number;
    subscribers: number;
    threads: number;
    replies: number;
  };
  views: { series: DayPoint[]; total: number; previous: number };
  members: { added: number; previous: number };
  subscribers: { added: number; previous: number };
  top: TopItem[];
  factCheck: { label: string; verified: number; total: number; href: string }[];
  drafts: { id: number; title: string; origin: string; updatedAt: string }[];
  topics: { name: string; articles: number }[];
};

export async function getDashboard(range: number): Promise<Dashboard> {
  const days = [7, 30, 90].includes(range) ? range : 30;
  const since = `-${days - 1} days`;
  const prevSince = `-${days * 2 - 1} days`;
  const prevUntil = `-${days} days`;

  const [totals, today, viewRows, viewSums, people, top, facts, drafts, topics] = await Promise.all([
    queryOne<Record<string, number>>(
      `SELECT (SELECT COUNT(*) FROM articles WHERE status = 'published') AS articles,
              (SELECT COUNT(*) FROM articles WHERE status != 'published') AS drafts,
              (SELECT COUNT(*) FROM conditions WHERE status = 'published') AS conditions,
              (SELECT COUNT(*) FROM users WHERE password_hash != '!disabled') AS members,
              (SELECT COUNT(*) FROM subscribers WHERE status = 'active') AS subscribers,
              (SELECT COUNT(*) FROM forum_threads WHERE hidden = 0) AS threads,
              (SELECT COUNT(*) FROM forum_posts WHERE hidden = 0) AS replies`,
    ),
    queryOne<{ today: string }>("SELECT date('now') AS today"),
    query<{ day: string; views: number }>("SELECT day, SUM(views) AS views FROM daily_views WHERE day >= date('now', ?) GROUP BY day ORDER BY day", [since]),
    queryOne<Record<string, number>>(
      `SELECT (SELECT COALESCE(SUM(views), 0) FROM daily_views WHERE day >= date('now', ?1)) AS current,
              (SELECT COALESCE(SUM(views), 0) FROM daily_views WHERE day >= date('now', ?2) AND day <= date('now', ?3)) AS previous`,
      [since, prevSince, prevUntil],
    ),
    queryOne<Record<string, number>>(
      `SELECT (SELECT COUNT(*) FROM users WHERE password_hash != '!disabled' AND date(created_at) >= date('now', ?1)) AS members,
              (SELECT COUNT(*) FROM users WHERE password_hash != '!disabled' AND date(created_at) >= date('now', ?2) AND date(created_at) <= date('now', ?3)) AS members_prev,
              (SELECT COUNT(*) FROM subscribers WHERE date(created_at) >= date('now', ?1)) AS subs,
              (SELECT COUNT(*) FROM subscribers WHERE date(created_at) >= date('now', ?2) AND date(created_at) <= date('now', ?3)) AS subs_prev`,
      [since, prevSince, prevUntil],
    ),
    query<{ kind: string; slug: string; views: number; title: string | null }>(
      `SELECT v.kind, v.slug, SUM(v.views) AS views,
              CASE v.kind WHEN 'article' THEN (SELECT title FROM articles a WHERE a.slug = v.slug)
                          ELSE (SELECT name FROM conditions c WHERE c.slug = v.slug) END AS title
       FROM daily_views v WHERE v.day >= date('now', ?) GROUP BY v.kind, v.slug ORDER BY views DESC, v.slug LIMIT 8`,
      [since],
    ),
    queryOne<Record<string, number>>(
      `SELECT (SELECT COUNT(*) FROM articles) AS a_total, (SELECT COUNT(*) FROM articles WHERE fact_check = 'verified') AS a_ok,
              (SELECT COUNT(*) FROM conditions) AS c_total, (SELECT COUNT(*) FROM conditions WHERE fact_check = 'verified') AS c_ok`,
    ),
    query<{ id: number; title: string; origin: string; updated_at: string }>(
      "SELECT id, title, origin, updated_at FROM articles WHERE status != 'published' ORDER BY updated_at DESC LIMIT 6",
    ),
    query<{ name: string; articles: number }>(
      `SELECT c.name, (SELECT COUNT(*) FROM articles a WHERE a.category = c.slug AND a.status = 'published') AS articles
       FROM categories c WHERE c.status = 'published' ORDER BY articles DESC, c.sort_order`,
    ),
  ]);

  // Fill days with no views, counting back from the database's "today".
  const byDay = new Map(viewRows.map((r) => [r.day, n(r.views)]));
  const end = Date.parse(`${today?.today ?? "1970-01-01"}T00:00:00Z`);
  const series: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(end - i * 86_400_000).toISOString().slice(0, 10);
    series.push({ day, views: byDay.get(day) ?? 0 });
  }

  return {
    range: days,
    totals: {
      articles: n(totals?.articles),
      drafts: n(totals?.drafts),
      conditions: n(totals?.conditions),
      members: n(totals?.members),
      subscribers: n(totals?.subscribers),
      threads: n(totals?.threads),
      replies: n(totals?.replies),
    },
    views: { series, total: n(viewSums?.current), previous: n(viewSums?.previous) },
    members: { added: n(people?.members), previous: n(people?.members_prev) },
    subscribers: { added: n(people?.subs), previous: n(people?.subs_prev) },
    top: top.map((t) => ({ kind: t.kind, slug: t.slug, title: t.title ?? t.slug, views: n(t.views) })),
    factCheck: [
      { label: "Articles", verified: n(facts?.a_ok), total: n(facts?.a_total), href: "/admin/c/articles?fact=pending" },
      { label: "Conditions", verified: n(facts?.c_ok), total: n(facts?.c_total), href: "/admin/c/conditions?fact=pending" },
    ],
    drafts: drafts.map((d) => ({ id: d.id, title: d.title, origin: d.origin, updatedAt: d.updated_at })),
    topics: topics.map((t) => ({ name: t.name, articles: n(t.articles) })),
  };
}

/* ------------------------------------------------------------------ */
/* Community                                                           */
/* ------------------------------------------------------------------ */

export type ReportRow = {
  id: number;
  targetType: "thread" | "post";
  targetId: number;
  reason: string;
  createdAt: string;
  reporter: string | null;
  /** Null when the reported item has since been deleted. */
  threadId: number | null;
  title: string;
  excerpt: string;
  author: string;
  hidden: boolean;
};

export async function listOpenReports(): Promise<ReportRow[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT r.id, r.target_type, r.target_id, r.reason, r.created_at, ru.handle AS reporter,
            t.id AS t_id, t.title AS t_title, t.body AS t_body, t.hidden AS t_hidden, tu.handle AS t_author,
            p.id AS p_id, p.body AS p_body, p.hidden AS p_hidden, p.thread_id AS p_thread, pt.title AS p_title, pu.handle AS p_author
     FROM reports r
     LEFT JOIN users ru ON ru.id = r.reporter_id
     LEFT JOIN forum_threads t ON r.target_type = 'thread' AND t.id = r.target_id
     LEFT JOIN users tu ON tu.id = t.user_id
     LEFT JOIN forum_posts p ON r.target_type = 'post' AND p.id = r.target_id
     LEFT JOIN forum_threads pt ON pt.id = p.thread_id
     LEFT JOIN users pu ON pu.id = p.user_id
     WHERE r.status = 'open' ORDER BY r.created_at DESC LIMIT 100`,
  );
  return rows.map((r) => {
    const isThread = r.target_type === "thread";
    const body = String((isThread ? r.t_body : r.p_body) ?? "");
    return {
      id: n(r.id),
      targetType: isThread ? "thread" : "post",
      targetId: n(r.target_id),
      reason: String(r.reason ?? ""),
      createdAt: String(r.created_at),
      reporter: (r.reporter as string | null) ?? null,
      threadId: isThread ? (r.t_id == null ? null : n(r.t_id)) : r.p_thread == null ? null : n(r.p_thread),
      title: String((isThread ? r.t_title : r.p_title) ?? "(deleted)"),
      excerpt: body.length > 220 ? `${body.slice(0, 220)}…` : body,
      author: String((isThread ? r.t_author : r.p_author) ?? "unknown"),
      hidden: (isThread ? r.t_hidden : r.p_hidden) === 1,
    };
  });
}

export type ThreadRow = {
  id: number;
  title: string;
  board: string;
  author: string;
  authorId: number;
  hidden: boolean;
  locked: boolean;
  pinned: boolean;
  replies: number;
  createdAt: string;
};

export async function listRecentThreads(search = "", limit = 40): Promise<ThreadRow[]> {
  const q = search.trim().slice(0, 60);
  const rows = await query<Record<string, unknown>>(
    `SELECT t.id, t.title, b.name AS board, u.handle AS author, u.id AS author_id, t.hidden, t.locked, t.pinned, t.reply_count, t.created_at
     FROM forum_threads t JOIN forum_boards b ON b.id = t.board_id JOIN users u ON u.id = t.user_id
     ${q ? "WHERE t.title LIKE ?1 OR t.body LIKE ?1 OR u.handle LIKE ?1" : ""}
     ORDER BY t.created_at DESC LIMIT ${Math.min(limit, 100)}`,
    q ? [`%${q}%`] : [],
  );
  return rows.map((r) => ({
    id: n(r.id),
    title: String(r.title),
    board: String(r.board),
    author: String(r.author),
    authorId: n(r.author_id),
    hidden: r.hidden === 1,
    locked: r.locked === 1,
    pinned: r.pinned === 1,
    replies: n(r.reply_count),
    createdAt: String(r.created_at),
  }));
}

export type PostRow = { id: number; excerpt: string; threadId: number; threadTitle: string; author: string; authorId: number; hidden: boolean; createdAt: string };

export async function listRecentPosts(search = "", limit = 40): Promise<PostRow[]> {
  const q = search.trim().slice(0, 60);
  const rows = await query<Record<string, unknown>>(
    `SELECT p.id, p.body, p.thread_id, t.title, u.handle AS author, u.id AS author_id, p.hidden, p.created_at
     FROM forum_posts p JOIN forum_threads t ON t.id = p.thread_id JOIN users u ON u.id = p.user_id
     ${q ? "WHERE p.body LIKE ?1 OR u.handle LIKE ?1" : ""}
     ORDER BY p.created_at DESC LIMIT ${Math.min(limit, 100)}`,
    q ? [`%${q}%`] : [],
  );
  return rows.map((r) => {
    const body = String(r.body);
    return {
      id: n(r.id),
      excerpt: body.length > 200 ? `${body.slice(0, 200)}…` : body,
      threadId: n(r.thread_id),
      threadTitle: String(r.title),
      author: String(r.author),
      authorId: n(r.author_id),
      hidden: r.hidden === 1,
      createdAt: String(r.created_at),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Members                                                             */
/* ------------------------------------------------------------------ */

export type MemberRow = {
  id: number;
  name: string;
  handle: string;
  email: string;
  role: string;
  banned: boolean;
  sticker: string;
  color: string;
  createdAt: string;
  lastSeenAt: string | null;
  posts: number;
};

const PAGE = 40;

export async function listMembers(opts: { q?: string; filter?: string; page?: number }): Promise<{ rows: MemberRow[]; total: number; page: number; pages: number }> {
  const where = ["u.password_hash != '!disabled'"];
  const args: (string | number)[] = [];
  const q = (opts.q ?? "").trim().slice(0, 60);
  if (q) {
    where.push("(u.name LIKE ? OR u.handle LIKE ? OR u.email LIKE ?)");
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (opts.filter === "staff") where.push("u.role IN ('admin', 'editor')");
  if (opts.filter === "suspended") where.push("u.banned = 1");
  const clause = `WHERE ${where.join(" AND ")}`;
  const total = n((await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM users u ${clause}`, args))?.n);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.min(Math.max(1, Math.floor(opts.page ?? 1) || 1), pages);
  const rows = await query<Record<string, unknown>>(
    `SELECT u.id, u.name, u.handle, u.email, u.role, u.banned, u.sticker, u.color, u.created_at, u.last_seen_at,
            (SELECT COUNT(*) FROM forum_threads t WHERE t.user_id = u.id) + (SELECT COUNT(*) FROM forum_posts p WHERE p.user_id = u.id) AS posts
     FROM users u ${clause} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [...args, PAGE, (page - 1) * PAGE],
  );
  return {
    rows: rows.map((r) => ({
      id: n(r.id),
      name: String(r.name),
      handle: String(r.handle),
      email: String(r.email),
      role: String(r.role),
      banned: r.banned === 1,
      sticker: String(r.sticker),
      color: String(r.color),
      createdAt: String(r.created_at),
      lastSeenAt: (r.last_seen_at as string | null) ?? null,
      posts: n(r.posts),
    })),
    total,
    page,
    pages,
  };
}

/* ------------------------------------------------------------------ */
/* Subscribers, messages, media, tokens                                */
/* ------------------------------------------------------------------ */

export type SubscriberRow = { id: number; email: string; name: string; status: string; source: string; createdAt: string };

export async function listSubscribers(opts: { q?: string; status?: string; page?: number }): Promise<{
  rows: SubscriberRow[];
  total: number;
  page: number;
  pages: number;
  counts: { active: number; unsubscribed: number };
}> {
  const where: string[] = [];
  const args: (string | number)[] = [];
  const q = (opts.q ?? "").trim().slice(0, 60);
  if (q) {
    where.push("(email LIKE ? OR name LIKE ?)");
    args.push(`%${q}%`, `%${q}%`);
  }
  if (opts.status === "active" || opts.status === "unsubscribed") {
    where.push("status = ?");
    args.push(opts.status);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = n((await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM subscribers ${clause}`, args))?.n);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.min(Math.max(1, Math.floor(opts.page ?? 1) || 1), pages);
  const rows = await query<Record<string, unknown>>(
    `SELECT id, email, name, status, source, created_at FROM subscribers ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...args, PAGE, (page - 1) * PAGE],
  );
  const c = await queryOne<Record<string, number>>(
    "SELECT COALESCE(SUM(status = 'active'), 0) AS active, COALESCE(SUM(status != 'active'), 0) AS gone FROM subscribers",
  );
  return {
    rows: rows.map((r) => ({ id: n(r.id), email: String(r.email), name: String(r.name), status: String(r.status), source: String(r.source), createdAt: String(r.created_at) })),
    total,
    page,
    pages,
    counts: { active: n(c?.active), unsubscribed: n(c?.gone) },
  };
}

export type MessageRow = { id: number; name: string; email: string; subject: string; message: string; status: string; createdAt: string };

export async function listMessages(status: string): Promise<{ rows: MessageRow[]; counts: Record<string, number> }> {
  const wanted = ["new", "read", "archived"].includes(status) ? status : "inbox";
  const rows = await query<Record<string, unknown>>(
    `SELECT id, name, email, subject, message, status, created_at FROM contact_messages
     WHERE ${wanted === "inbox" ? "status != 'archived'" : "status = ?"} ORDER BY created_at DESC LIMIT 200`,
    wanted === "inbox" ? [] : [wanted],
  );
  const counts = await queryOne<Record<string, number>>(
    `SELECT COALESCE(SUM(status = 'new'), 0) AS new, COALESCE(SUM(status = 'read'), 0) AS read,
            COALESCE(SUM(status = 'archived'), 0) AS archived FROM contact_messages`,
  );
  return {
    rows: rows.map((r) => ({
      id: n(r.id),
      name: String(r.name),
      email: String(r.email),
      subject: String(r.subject),
      message: String(r.message),
      status: String(r.status),
      createdAt: String(r.created_at),
    })),
    counts: { new: n(counts?.new), read: n(counts?.read), archived: n(counts?.archived) },
  };
}

export type MediaRow = { id: number; filename: string; mime: string; size: number; alt: string; createdAt: string };

export async function listMedia(): Promise<MediaRow[]> {
  const rows = await query<Record<string, unknown>>("SELECT id, filename, mime, size, alt, created_at FROM media ORDER BY id DESC LIMIT 300");
  return rows.map((r) => ({ id: n(r.id), filename: String(r.filename), mime: String(r.mime), size: n(r.size), alt: String(r.alt), createdAt: String(r.created_at) }));
}

export type TokenRow = { id: number; name: string; prefix: string; createdAt: string; lastUsedAt: string | null; revoked: boolean };

export async function listTokens(): Promise<TokenRow[]> {
  const rows = await query<Record<string, unknown>>("SELECT id, name, prefix, created_at, last_used_at, revoked FROM api_tokens ORDER BY id DESC");
  return rows.map((r) => ({
    id: n(r.id),
    name: String(r.name),
    prefix: String(r.prefix),
    createdAt: String(r.created_at),
    lastUsedAt: (r.last_used_at as string | null) ?? null,
    revoked: r.revoked === 1,
  }));
}
