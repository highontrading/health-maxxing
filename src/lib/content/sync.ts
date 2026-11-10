/**
 * Loads content/ into the database.
 *
 * Rules:
 * - A row that does not exist is created (origin "seed").
 * - A row whose seed file changed is updated, unless someone edited it in the
 *   admin panel (edited = 1). Admin edits always win; pass force to override.
 * - Rows are never deleted here unless prune is set, and then only untouched
 *   seed rows whose file has gone.
 */
import fs from "node:fs";
import path from "node:path";
import type { InStatement, InValue } from "@libsql/client";
import { batch, databaseUrl, isLocalDatabase, query, queryOne, run } from "../db";
import { generatePassword, hashPassword, sha1 } from "../security";
import { loadContent, type LoadedContent } from "./load";

export type SyncOptions = { force?: boolean; prune?: boolean; log?: (line: string) => void };
export type SyncReport = Record<string, { created: number; updated: number; unchanged: number; kept: number; pruned: number }>;

type Existing = { slug: string; seed_hash: string | null; edited: number; origin: string };

const TEAM_EMAIL = "team@healthmaxxing.local";

async function upsertTable(
  table: string,
  rows: { slug: string; insert: Record<string, InValue>; update?: Record<string, InValue> }[],
  opts: SyncOptions,
  report: SyncReport,
) {
  const stats = (report[table] = { created: 0, updated: 0, unchanged: 0, kept: 0, pruned: 0 });
  const existing = new Map(
    (await query<Existing>(`SELECT slug, seed_hash, edited, origin FROM ${table}`)).map((r) => [r.slug, r]),
  );
  const statements: InStatement[] = [];
  const now = new Date().toISOString();

  for (const row of rows) {
    const updateCols = row.update ?? row.insert;
    const hash = sha1(JSON.stringify(updateCols));
    const current = existing.get(row.slug);
    if (!current) {
      const cols = { slug: row.slug, ...row.insert, origin: "seed", seed_hash: hash, edited: 0 };
      const names = Object.keys(cols);
      statements.push({
        sql: `INSERT INTO ${table} (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`,
        args: Object.values(cols),
      });
      stats.created++;
    } else if (current.edited && !opts.force) {
      stats.kept++;
    } else if (current.seed_hash === hash && !opts.force) {
      stats.unchanged++;
    } else {
      const cols = { ...updateCols, seed_hash: hash, edited: 0, updated_at: now };
      const names = Object.keys(cols);
      statements.push({
        sql: `UPDATE ${table} SET ${names.map((n) => `${n} = ?`).join(", ")} WHERE slug = ?`,
        args: [...Object.values(cols), row.slug],
      });
      stats.updated++;
    }
  }

  if (opts.prune) {
    const keep = new Set(rows.map((r) => r.slug));
    for (const [slug, current] of existing) {
      if (!keep.has(slug) && current.origin === "seed" && !current.edited) {
        statements.push({ sql: `DELETE FROM ${table} WHERE slug = ?`, args: [slug] });
        stats.pruned++;
      }
    }
  }

  for (let i = 0; i < statements.length; i += 40) await batch(statements.slice(i, i + 40));
}

const J = (v: unknown) => JSON.stringify(v ?? []);

export async function syncContent(opts: SyncOptions = {}): Promise<{ report: SyncReport; content: LoadedContent }> {
  const log = opts.log ?? (() => {});
  const content = loadContent();
  const report: SyncReport = {};
  const now = new Date();
  const nowIso = now.toISOString();

  // ---- Categories and body systems
  await upsertTable(
    "categories",
    content.categories.map((c) => ({
      slug: c.slug,
      insert: {
        name: c.name,
        tagline: c.tagline,
        description: c.description,
        color: c.color,
        sticker: c.sticker,
        sort_order: c.order,
      },
    })),
    opts,
    report,
  );
  await upsertTable(
    "body_systems",
    content.bodySystems.map((s) => ({
      slug: s.slug,
      insert: {
        name: s.name,
        description: s.description,
        color: s.color,
        sticker: s.sticker,
        organs: J(s.organs),
        categories: J(s.categories),
        sort_order: s.order,
      },
    })),
    opts,
    report,
  );

  // ---- Articles. On the very first sync, stagger publish times so "latest"
  // interleaves topics instead of listing one category after another.
  const firstRun = ((await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM articles"))?.n ?? 0) === 0;
  const categoryOrder = new Map(content.categories.map((c) => [c.slug, c.order]));
  const positionInCategory = new Map<string, number>();
  const byPlan = [...content.articles].sort((a, b) => a.order - b.order);
  const rank = new Map<string, number>();
  for (const a of byPlan) {
    const pos = positionInCategory.get(a.category) ?? 0;
    positionInCategory.set(a.category, pos + 1);
    rank.set(a.slug, pos * 32 + (categoryOrder.get(a.category) ?? 31));
  }
  const ranked = [...rank.entries()].sort((a, b) => a[1] - b[1]).map(([slug], i) => [slug, i] as const);
  const rankIndex = new Map(ranked);

  await upsertTable(
    "articles",
    content.articles.map((a) => {
      const body = {
        title: a.title,
        dek: a.dek,
        summary: a.summary,
        category: a.category,
        tags: J(a.tags),
        sticker: a.sticker,
        kind: a.kind,
        body: a.body,
        takeaways: J(a.takeaways),
        faqs: J(a.faqs),
        sources: J(a.sources),
        related: J(a.related),
        featured: a.featured ? 1 : 0,
        reading_minutes: a.readingMinutes,
        word_count: a.words,
        sort_order: a.order,
        fact_check: a.factCheck ?? "pending",
      };
      const publishedAt = new Date(
        now.getTime() - (firstRun ? (rankIndex.get(a.slug) ?? 0) * 60_000 : 0),
      ).toISOString();
      return {
        slug: a.slug,
        insert: { ...body, status: "published", published_at: publishedAt, reviewed_at: nowIso },
        update: body,
      };
    }),
    opts,
    report,
  );

  await upsertTable(
    "conditions",
    content.conditions.map((c) => {
      const body = {
        name: c.name,
        aka: J(c.aka),
        system: c.system,
        category: c.category,
        summary: c.summary,
        symptoms: J(c.symptoms),
        urgent: J(c.urgent),
        body: c.body,
        sources: J(c.sources),
        fact_check: c.factCheck ?? "pending",
      };
      return { slug: c.slug, insert: { ...body, status: "published", reviewed_at: nowIso }, update: body };
    }),
    opts,
    report,
  );

  await upsertTable(
    "glossary",
    content.glossary.map((t) => ({
      slug: t.slug,
      insert: { term: t.term, definition: t.definition, category: t.category, see_also: J(t.seeAlso) },
    })),
    opts,
    report,
  );

  await upsertTable(
    "myths",
    content.myths.map((m, i) => ({
      slug: m.slug,
      insert: {
        myth: m.myth,
        verdict: m.verdict,
        answer: m.answer,
        explanation: m.explanation,
        category: m.category,
        sticker: m.sticker,
        sources: J(m.sources),
        sort_order: i,
      },
    })),
    opts,
    report,
  );

  await upsertTable(
    "foods",
    content.foods.map((f) => ({
      slug: f.slug,
      insert: {
        name: f.name,
        food_group: f.group,
        fdc_id: f.fdcId ?? null,
        serving_label: f.serving.label,
        serving_grams: f.serving.grams,
        kcal: f.per100g.kcal,
        protein: f.per100g.protein,
        carbs: f.per100g.carbs,
        fiber: f.per100g.fiber,
        sugars: f.per100g.sugars,
        fat: f.per100g.fat,
        sat_fat: f.per100g.satFat,
        sodium_mg: f.per100g.sodiumMg,
        micros: J(f.micros),
        note: f.note,
      },
    })),
    opts,
    report,
  );

  await upsertTable(
    "exercises",
    content.exercises.map((e) => ({
      slug: e.slug,
      insert: {
        name: e.name,
        type: e.type,
        pattern: e.pattern,
        primary_muscles: J(e.muscles.primary),
        secondary_muscles: J(e.muscles.secondary),
        equipment: J(e.equipment),
        level: e.level,
        summary: e.summary,
        steps: J(e.steps),
        cues: J(e.cues),
        mistakes: J(e.mistakes),
        easier: e.easier ?? "",
        harder: e.harder ?? "",
      },
    })),
    opts,
    report,
  );

  await upsertTable(
    "pages",
    content.pages.map((p) => ({
      slug: p.slug,
      insert: { title: p.title, description: p.description, body: p.body },
    })),
    opts,
    report,
  );

  await upsertTable(
    "newsletter_issues",
    content.newsletter.map((n) => {
      const body = {
        number: n.number,
        title: n.title,
        preheader: n.preheader,
        sticker: n.sticker ?? "mail",
        body: n.body,
      };
      return { slug: n.slug, insert: { ...body, status: "published", published_at: nowIso }, update: body };
    }),
    opts,
    report,
  );

  await upsertTable(
    "forum_boards",
    content.forumBoards.map((b) => ({
      slug: b.slug,
      insert: { name: b.name, description: b.description, sticker: b.sticker, color: b.color, sort_order: b.order },
    })),
    opts,
    report,
  );

  // ---- Official starter threads, posted by the team account. Insert-only.
  if (content.forumThreads.length) {
    let team = await queryOne<{ id: number }>("SELECT id FROM users WHERE email = ?", [TEAM_EMAIL]);
    if (!team) {
      const res = await run(
        "INSERT INTO users (email, handle, name, password_hash, role, bio, sticker, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          TEAM_EMAIL,
          "team",
          "Health Maxxing Team",
          "!disabled",
          "editor",
          "The official account of the Health Maxxing editors. We post prompts, updates and house rules.",
          "heart",
          "pink",
        ],
      );
      team = { id: res.lastId };
    }
    const boards = new Map(
      (await query<{ id: number; slug: string }>("SELECT id, slug FROM forum_boards")).map((b) => [b.slug, b.id]),
    );
    const stats = (report.forum_threads = { created: 0, updated: 0, unchanged: 0, kept: 0, pruned: 0 });
    let offset = 0;
    for (const t of content.forumThreads) {
      const key = sha1(`${t.board}:${t.title}`).slice(0, 16);
      const exists = await queryOne("SELECT id FROM forum_threads WHERE seed_key = ?", [key]);
      const boardId = boards.get(t.board);
      if (exists || !boardId) {
        stats.unchanged++;
        continue;
      }
      const at = new Date(now.getTime() - offset++ * 60_000).toISOString();
      await run(
        `INSERT INTO forum_threads (board_id, user_id, title, body, pinned, locked, seed_key, created_at, updated_at, last_post_at, last_post_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [boardId, team.id, t.title, t.body, t.pinned ? 1 : 0, t.locked ? 1 : 0, key, at, at, at, team.id],
      );
      stats.created++;
    }
  }

  // ---- Settings: add missing keys only, so admin changes are never overwritten.
  const settingKeys = new Set((await query<{ key: string }>("SELECT key FROM settings")).map((r) => r.key));
  let settingsAdded = 0;
  for (const [key, value] of Object.entries(content.site)) {
    if (key.startsWith("_")) continue;
    if (settingKeys.has(key) && !opts.force) continue;
    await run(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = ?",
      [key, JSON.stringify(value), nowIso],
    );
    settingsAdded++;
  }
  report.settings = { created: settingsAdded, updated: 0, unchanged: settingKeys.size, kept: 0, pruned: 0 };

  await ensureAdmin(log);
  return { report, content };
}

/**
 * Makes sure an admin account exists.
 * - ADMIN_EMAIL + ADMIN_PASSWORD set: that account is created or its password reset.
 * - Nothing set, local database: a random password is generated once and written
 *   to data/admin-credentials.txt.
 * - Nothing set, remote database: no account is created (set the variables).
 */
export async function ensureAdmin(log: (line: string) => void = () => {}): Promise<void> {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const admins = await query<{ id: number; email: string }>("SELECT id, email FROM users WHERE role = 'admin'");

  if (email && password) {
    if (password.length < 10) {
      log("! ADMIN_PASSWORD must be at least 10 characters. Admin account not changed.");
      return;
    }
    const hash = await hashPassword(password);
    const existing = await queryOne<{ id: number }>("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) {
      await run("UPDATE users SET password_hash = ?, role = 'admin', banned = 0 WHERE id = ?", [hash, existing.id]);
    } else {
      await run(
        "INSERT INTO users (email, handle, name, password_hash, role, sticker, color) VALUES (?, ?, ?, ?, 'admin', 'sparkle', 'lime')",
        [email, await freeHandle("admin"), "Admin", hash],
      );
      log(`+ Created admin account ${email} from ADMIN_EMAIL / ADMIN_PASSWORD.`);
    }
    return;
  }

  if (admins.length) return;

  if (!isLocalDatabase()) {
    log("! No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD, then run the sync again.");
    return;
  }

  const generatedEmail = email || "admin@healthmaxxing.local";
  const generated = generatePassword();
  await run(
    "INSERT INTO users (email, handle, name, password_hash, role, sticker, color) VALUES (?, ?, ?, ?, 'admin', 'sparkle', 'lime')",
    [generatedEmail, await freeHandle("admin"), "Admin", await hashPassword(generated)],
  );
  const file = path.join(path.dirname(path.resolve(databaseUrl().slice("file:".length))), "admin-credentials.txt");
  fs.writeFileSync(
    file,
    `Health Maxxing admin login\n\nURL:      /admin\nEmail:    ${generatedEmail}\nPassword: ${generated}\n\nGenerated on first run. Change it under Admin > Account, or set ADMIN_EMAIL and ADMIN_PASSWORD.\n`,
    { mode: 0o600 },
  );
  log(`+ Created admin account ${generatedEmail}. Password saved to ${path.relative(process.cwd(), file)}`);
}

async function freeHandle(base: string): Promise<string> {
  let handle = base;
  let n = 1;
  while (await queryOne("SELECT id FROM users WHERE handle = ?", [handle])) handle = `${base}${++n}`;
  return handle;
}
