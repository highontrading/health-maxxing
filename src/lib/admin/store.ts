/**
 * Reads and writes behind the admin panel, the content API and the autopilot.
 * Nothing here is cached, and nothing here checks permissions: callers do that
 * first, then refresh the cache tags of the collection they changed.
 */
import type { InStatement } from "@libsql/client";
import { logActivity } from "@/lib/activity";
import { COLOR_KEYS, countWords, EXERCISE_EQUIPMENT, readingMinutes, slugify } from "@/lib/content/schema";
import { batch, json, query, queryOne, run, type InValue } from "@/lib/db";
import { JSON_FIELD_TYPES, type CollectionDef, type FieldDef, type Option } from "./collections";

export type Row = Record<string, unknown>;
export type EntryErrors = Record<string, string>;
export type DynamicOptions = { categories: Option[]; systems: Option[] };

const PER_PAGE = 40;

/** Top-level routes a standing page must not shadow. */
const RESERVED_PAGE_SLUGS = new Set([
  "admin", "api", "articles", "topics", "conditions", "body", "tools", "exercises", "foods", "myths", "glossary",
  "search", "saved", "contact", "newsletter", "community", "login", "signup", "account", "stickers", "media",
  "rss.xml", "sitemap.xml", "robots.txt", "feed",
]);

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

export async function loadOptions(): Promise<DynamicOptions> {
  const [categories, systems] = await Promise.all([
    query<{ slug: string; name: string }>("SELECT slug, name FROM categories ORDER BY sort_order, name"),
    query<{ slug: string; name: string }>("SELECT slug, name FROM body_systems ORDER BY sort_order, name"),
  ]);
  const toOption = (r: { slug: string; name: string }): Option => ({ value: r.slug, label: r.name });
  return { categories: categories.map(toOption), systems: systems.map(toOption) };
}

export function optionsFor(field: FieldDef, dynamic: DynamicOptions): Option[] {
  if (field.optionsFrom === "categories") return dynamic.categories;
  if (field.optionsFrom === "systems") return dynamic.systems;
  return field.options ?? [];
}

/* ------------------------------------------------------------------ */
/* Reading                                                             */
/* ------------------------------------------------------------------ */

export type ListQuery = { q?: string; status?: string; fact?: string; topic?: string; page?: number };
export type ListRow = {
  id: number;
  slug: string;
  title: string;
  status: string;
  updatedAt: string;
  origin: string;
  edited: boolean;
  factCheck?: string;
  topic?: string;
  views?: number;
  publishedAt?: string | null;
};
export type ListResult = {
  rows: ListRow[];
  total: number;
  page: number;
  pages: number;
  counts: { all: number; published: number; draft: number; pending: number };
};

const hasColumn = (def: CollectionDef, name: string) => def.fields.some((f) => f.name === name);
const likeTerm = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function listRows(def: CollectionDef, q: ListQuery = {}): Promise<ListResult> {
  const where: string[] = [];
  const args: InValue[] = [];
  const search = (q.q ?? "").trim().slice(0, 80);
  if (search) {
    where.push(`(${def.search.map((c) => `${c} LIKE ? ESCAPE '\\'`).join(" OR ")})`);
    for (let i = 0; i < def.search.length; i++) args.push(likeTerm(search));
  }
  if (q.status === "published" || q.status === "draft") {
    where.push("status = ?");
    args.push(q.status);
  }
  if (def.factCheck && (q.fact === "pending" || q.fact === "verified")) {
    where.push("fact_check = ?");
    args.push(q.fact);
  }
  if (def.topicColumn && q.topic) {
    where.push(`${def.topicColumn} = ?`);
    args.push(q.topic);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const columns = ["id", "slug", `${def.title} AS title`, "status", "updated_at", "origin", "edited"];
  if (def.factCheck) columns.push("fact_check");
  if (def.topicColumn) columns.push(`${def.topicColumn} AS topic`);
  if (def.hasViews) columns.push("views");
  if (hasColumn(def, "published_at")) columns.push("published_at");

  const total = (await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM ${def.table} ${clause}`, args))?.n ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(Math.max(1, Math.floor(q.page ?? 1) || 1), pages);
  const rows = await query<Row>(
    `SELECT ${columns.join(", ")} FROM ${def.table} ${clause} ORDER BY ${def.orderBy} LIMIT ? OFFSET ?`,
    [...args, PER_PAGE, (page - 1) * PER_PAGE],
  );
  const c = await queryOne<{ total: number; published: number; pending: number }>(
    `SELECT COUNT(*) AS total, COALESCE(SUM(status = 'published'), 0) AS published,
            ${def.factCheck ? "COALESCE(SUM(fact_check = 'pending'), 0)" : "0"} AS pending
     FROM ${def.table}`,
  );
  return {
    rows: rows.map((r) => ({
      id: Number(r.id),
      slug: String(r.slug),
      title: String(r.title ?? ""),
      status: String(r.status),
      updatedAt: String(r.updated_at),
      origin: String(r.origin),
      edited: r.edited === 1,
      factCheck: def.factCheck ? String(r.fact_check) : undefined,
      topic: def.topicColumn ? String(r.topic ?? "") : undefined,
      views: def.hasViews ? Number(r.views ?? 0) : undefined,
      publishedAt: hasColumn(def, "published_at") ? ((r.published_at as string | null) ?? null) : undefined,
    })),
    total,
    page,
    pages,
    counts: {
      all: c?.total ?? 0,
      published: c?.published ?? 0,
      draft: (c?.total ?? 0) - (c?.published ?? 0),
      pending: c?.pending ?? 0,
    },
  };
}

export async function getRow(def: CollectionDef, id: number): Promise<Row | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  return queryOne<Row>(`SELECT * FROM ${def.table} WHERE id = ?`, [id]);
}

export async function getRowBySlug(def: CollectionDef, slug: string): Promise<Row | null> {
  return queryOne<Row>(`SELECT * FROM ${def.table} WHERE slug = ?`, [slug]);
}

/** A database row as the values the edit form (and the API) works with. */
export function toEntry(def: CollectionDef, row: Row): Row {
  const out: Row = { id: row.id, slug: row.slug };
  for (const f of def.fields) {
    const v = row[f.name];
    if (JSON_FIELD_TYPES.includes(f.type)) out[f.name] = json<unknown[]>(v, []);
    else if (f.type === "boolean") out[f.name] = v === 1;
    else out[f.name] = v ?? (f.type === "number" || f.type === "datetime" ? null : "");
  }
  for (const k of ["origin", "edited", "created_at", "updated_at", "views", "reviewed_at", "word_count", "reading_minutes"]) {
    if (k in row) out[k] = row[k];
  }
  return out;
}

/** Starting values for a new entry. */
export function blankEntry(def: CollectionDef): Row {
  const out: Row = { slug: "" };
  for (const f of def.fields) {
    if (JSON_FIELD_TYPES.includes(f.type)) out[f.name] = [];
    else if (f.type === "boolean") out[f.name] = f.default === true;
    else if (f.type === "number" || f.type === "datetime") out[f.name] = f.default ?? null;
    else out[f.name] = f.default ?? "";
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

type Coerced = { value?: InValue; error?: string };

function asList(raw: unknown, separator: RegExp): string[] {
  const parts = Array.isArray(raw) ? raw.map((v) => String(v ?? "")) : String(raw ?? "").split(separator);
  return parts.map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function asObjects(raw: unknown): Record<string, unknown>[] | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    if (!raw.trim()) return [];
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  return value.filter((v) => v && typeof v === "object") as Record<string, unknown>[];
}

const text = (v: unknown) => String(v ?? "").replace(/\r\n?/g, "\n").trim();

function validUrl(u: string): boolean {
  if (!/^https:\/\/[^\s]+$/.test(u)) return false;
  try {
    new URL(u);
    return true;
  } catch {
    return false;
  }
}

function coerce(field: FieldDef, raw: unknown, dynamic: DynamicOptions): Coerced {
  switch (field.type) {
    case "text":
    case "textarea":
    case "markdown": {
      const value = text(raw);
      if (field.required && !value) return { error: "Please fill this in." };
      if (field.max && value.length > field.max) return { error: `Keep this under ${field.max} characters (it is ${value.length}).` };
      return { value };
    }
    case "number": {
      if (raw === "" || raw === null || raw === undefined) {
        if (field.required) return { error: "Enter a number." };
        return { value: typeof field.default === "number" ? field.default : null };
      }
      const n = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
      if (!Number.isFinite(n)) return { error: "Enter a number." };
      if (field.min !== undefined && n < field.min) return { error: `This cannot be less than ${field.min}.` };
      if (field.max !== undefined && n > field.max) return { error: `This cannot be more than ${field.max}.` };
      return { value: field.step === 1 ? Math.round(n) : n };
    }
    case "boolean":
      return { value: raw === true || raw === 1 || raw === "on" || raw === "1" || raw === "true" ? 1 : 0 };
    case "select": {
      const value = text(raw);
      if (!value) {
        if (field.required) return { error: "Choose one." };
        return { value: typeof field.default === "string" ? field.default : "" };
      }
      if (!optionsFor(field, dynamic).some((o) => o.value === value)) return { error: "That is not one of the choices." };
      return { value };
    }
    case "sticker": {
      const value = text(raw) || (typeof field.default === "string" ? field.default : "heart");
      if (!/^[a-z0-9-]{1,40}$/.test(value)) return { error: "Pick a sticker from the list." };
      return { value };
    }
    case "color": {
      const value = text(raw) || (typeof field.default === "string" ? field.default : "lime");
      if (!(COLOR_KEYS as readonly string[]).includes(value)) return { error: "Pick a colour from the list." };
      return { value };
    }
    case "lines":
    case "csv": {
      const items = asList(raw, field.type === "lines" ? /\n/ : /[,\n]/);
      if (items.length > 40) return { error: "That is too many entries (40 at most)." };
      const long = items.find((s) => s.length > 500);
      if (long) return { error: "One entry is longer than 500 characters." };
      if (field.name === "equipment") {
        const unknown = items.filter((i) => !(EXERCISE_EQUIPMENT as readonly string[]).includes(i.toLowerCase()));
        if (unknown.length) return { error: `Not a known piece of equipment: ${unknown.join(", ")}.` };
        return { value: JSON.stringify(items.map((i) => i.toLowerCase())) };
      }
      return { value: JSON.stringify(items) };
    }
    case "sources": {
      const rows = asObjects(raw);
      if (!rows) return { error: "The sources could not be read. Reload the page and try again." };
      const out: { title: string; publisher: string; url: string; year?: number }[] = [];
      for (const [i, r] of rows.entries()) {
        const title = text(r.title);
        const publisher = text(r.publisher);
        const url = text(r.url);
        const yearRaw = r.year === "" || r.year == null ? undefined : Number(r.year);
        if (!title && !publisher && !url) continue;
        const n = `Source ${i + 1}`;
        if (title.length < 3) return { error: `${n}: add the title of the page or paper.` };
        if (publisher.length < 2) return { error: `${n}: add the publisher (for example “NHS” or “The Lancet”).` };
        if (!validUrl(url)) return { error: `${n}: the link must be a full address starting with https://` };
        if (yearRaw !== undefined && (!Number.isInteger(yearRaw) || yearRaw < 1900 || yearRaw > 2100)) return { error: `${n}: the year does not look right.` };
        out.push({ title: title.slice(0, 240), publisher: publisher.slice(0, 120), url, ...(yearRaw ? { year: yearRaw } : {}) });
      }
      if (out.length > 30) return { error: "That is too many sources (30 at most)." };
      return { value: JSON.stringify(out) };
    }
    case "faqs": {
      const rows = asObjects(raw);
      if (!rows) return { error: "The questions could not be read. Reload the page and try again." };
      const out: { q: string; a: string }[] = [];
      for (const [i, r] of rows.entries()) {
        const q = text(r.q);
        const a = text(r.a);
        if (!q && !a) continue;
        if (!q || !a) return { error: `Question ${i + 1}: fill in both the question and the answer.` };
        out.push({ q: q.slice(0, 200), a: a.slice(0, 1200) });
      }
      if (out.length > 12) return { error: "That is too many questions (12 at most)." };
      return { value: JSON.stringify(out) };
    }
    case "micros": {
      const rows = asObjects(raw);
      if (!rows) return { error: "The nutrients could not be read. Reload the page and try again." };
      const out: { name: string; amount: number; unit: string }[] = [];
      for (const [i, r] of rows.entries()) {
        const name = text(r.name);
        if (!name && (r.amount === "" || r.amount == null)) continue;
        const amount = Number(r.amount);
        const unit = text(r.unit) || "mg";
        if (!name) return { error: `Nutrient ${i + 1}: add a name.` };
        if (!Number.isFinite(amount) || amount < 0) return { error: `Nutrient ${i + 1}: the amount must be a number.` };
        if (!["mg", "mcg", "g", "IU"].includes(unit)) return { error: `Nutrient ${i + 1}: the unit must be mg, mcg, g or IU.` };
        out.push({ name: name.slice(0, 40), amount, unit });
      }
      if (out.length > 8) return { error: "That is too many nutrients (8 at most)." };
      return { value: JSON.stringify(out) };
    }
    case "datetime": {
      const value = text(raw);
      if (!value) return { value: null };
      const t = Date.parse(value);
      if (Number.isNaN(t)) return { error: "That date could not be read." };
      return { value: new Date(t).toISOString() };
    }
    case "image": {
      const value = text(raw);
      if (!value) return { value: "" };
      if (!/^\/media\/\d+$/.test(value) && !validUrl(value)) return { error: "Upload an image, or paste a link that starts with https://" };
      return { value };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Writing                                                             */
/* ------------------------------------------------------------------ */

export type SaveResult =
  | { ok: true; id: number; slug: string; created: boolean }
  | { ok: false; errors: EntryErrors; message?: string };

export type SaveOptions = {
  def: CollectionDef;
  /** Null to create. */
  id: number | null;
  /** Field values: strings from a form, or native JSON values from the API. */
  raw: Record<string, unknown>;
  /** Who is saving, for the activity log. */
  actor: string;
  /** Only touch the fields present in raw (API PATCH). */
  partial?: boolean;
  /** Recorded on new rows: admin, api or autopilot. */
  origin?: "admin" | "api" | "autopilot";
};

export async function saveEntry({ def, id, raw, actor, partial = false, origin = "admin" }: SaveOptions): Promise<SaveResult> {
  const existing = id ? await getRow(def, id) : null;
  if (id && !existing) return { ok: false, errors: {}, message: `That ${def.singular} no longer exists.` };

  const dynamic = def.fields.some((f) => f.optionsFrom) ? await loadOptions() : { categories: [], systems: [] };
  const data: Record<string, InValue> = {};
  const errors: EntryErrors = {};
  for (const field of def.fields) {
    if (field.name === "slug") continue;
    if (partial && !Object.prototype.hasOwnProperty.call(raw, field.name)) continue;
    const result = coerce(field, raw[field.name], dynamic);
    if (result.error) errors[field.name] = result.error;
    else data[field.name] = result.value as InValue;
  }

  // URL name: typed, or built from the title.
  let slug = existing ? String(existing.slug) : "";
  if (!partial || Object.prototype.hasOwnProperty.call(raw, "slug") || !existing) {
    const typed = text(raw.slug);
    const fromTitle = text(data[def.title] ?? existing?.[def.title]);
    slug = slugify(typed || (existing && !typed ? String(existing.slug) : fromTitle));
    if (!slug) errors.slug = "Add a URL name, or a title to build one from.";
    else if (def.key === "pages" && RESERVED_PAGE_SLUGS.has(slug)) errors.slug = "That address is already used by another part of the site.";
    else {
      const clash = await queryOne<{ id: number }>(`SELECT id FROM ${def.table} WHERE slug = ? AND id != ?`, [slug, id ?? 0]);
      if (clash) errors.slug = `Another ${def.singular} already uses this URL name.`;
    }
  }
  if (Object.keys(errors).length) return { ok: false, errors };

  // Derived columns.
  const now = new Date().toISOString();
  const merged = (name: string) => (name in data ? data[name] : existing?.[name]);
  if (def.key === "articles" && typeof data.body === "string") {
    data.word_count = countWords(data.body);
    data.reading_minutes = readingMinutes(data.body);
  }
  if (def.factCheck && data.fact_check === "verified" && existing?.fact_check !== "verified") data.reviewed_at = now;
  if (def.fields.some((f) => f.name === "published_at") && merged("status") === "published" && !merged("published_at")) {
    data.published_at = now;
  }

  const statements: InStatement[] = [];
  if (existing) {
    const cols = { ...data, slug, edited: 1, updated_at: now };
    const names = Object.keys(cols);
    statements.push({
      sql: `UPDATE ${def.table} SET ${names.map((n) => `${n} = ?`).join(", ")} WHERE id = ?`,
      args: [...Object.values(cols), id],
    });
    const oldSlug = String(existing.slug);
    if (oldSlug !== slug) {
      // Keep references pointing at the renamed row.
      if (def.key === "topics") {
        for (const t of ["articles", "conditions", "glossary", "myths"]) {
          statements.push({ sql: `UPDATE ${t} SET category = ? WHERE category = ?`, args: [slug, oldSlug] });
        }
      } else if (def.key === "body-systems") {
        statements.push({ sql: "UPDATE conditions SET system = ? WHERE system = ?", args: [slug, oldSlug] });
      }
    }
    await batch(statements);
    await logActivity(actor, "updated", def.key, id!, text(merged(def.title)));
    return { ok: true, id: id!, slug, created: false };
  }

  const cols: Record<string, InValue> = { ...data, slug, origin, edited: 1, created_at: now, updated_at: now };
  const names = Object.keys(cols);
  const res = await run(
    `INSERT INTO ${def.table} (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`,
    Object.values(cols),
  );
  // A new row with the URL name of a deleted file-based row replaces it for good.
  await run("DELETE FROM deleted_seeds WHERE table_name = ? AND slug = ?", [def.table, slug]);
  await logActivity(actor, "created", def.key, res.lastId, text(data[def.title]));
  return { ok: true, id: res.lastId, slug, created: true };
}

/** Why a row cannot be deleted, or null when it can. */
async function deleteBlocker(def: CollectionDef, row: Row): Promise<string | null> {
  const slug = String(row.slug);
  if (def.key === "topics") {
    const n = (await queryOne<{ n: number }>(
      `SELECT (SELECT COUNT(*) FROM articles WHERE category = ?1) + (SELECT COUNT(*) FROM conditions WHERE category = ?1)
            + (SELECT COUNT(*) FROM glossary WHERE category = ?1) + (SELECT COUNT(*) FROM myths WHERE category = ?1) AS n`,
      [slug],
    ))?.n;
    if (n) return `${n} articles, conditions, terms or myths are filed under this topic. Move them first, or set the topic to Draft to hide it.`;
  }
  if (def.key === "body-systems") {
    const n = (await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM conditions WHERE system = ?", [slug]))?.n;
    if (n) return `${n} conditions are filed under this body system. Move them first, or set it to Draft to hide it.`;
  }
  if (def.key === "boards") {
    const n = (await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM forum_threads WHERE board_id = ?", [Number(row.id)]))?.n;
    if (n) return `This board has ${n} threads. Set it to Draft to hide it instead.`;
  }
  return null;
}

export async function deleteEntry(def: CollectionDef, id: number, actor: string): Promise<{ ok: boolean; message?: string }> {
  const row = await getRow(def, id);
  if (!row) return { ok: false, message: `That ${def.singular} no longer exists.` };
  const blocker = await deleteBlocker(def, row);
  if (blocker) return { ok: false, message: blocker };
  const statements: InStatement[] = [{ sql: `DELETE FROM ${def.table} WHERE id = ?`, args: [id] }];
  if (row.origin === "seed") {
    statements.push({ sql: "INSERT OR IGNORE INTO deleted_seeds (table_name, slug) VALUES (?, ?)", args: [def.table, String(row.slug)] });
  }
  await batch(statements);
  await logActivity(actor, "deleted", def.key, id, text(row[def.title]));
  return { ok: true };
}

export type BulkOp = "publish" | "draft" | "verify" | "unverify" | "delete";

export async function bulkUpdate(def: CollectionDef, ids: number[], op: BulkOp, actor: string): Promise<{ changed: number; skipped: string[] }> {
  const clean = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))].slice(0, 200);
  const skipped: string[] = [];
  if (!clean.length) return { changed: 0, skipped };
  const marks = clean.map(() => "?").join(", ");
  const now = new Date().toISOString();
  let changed = 0;

  if (op === "delete") {
    for (const id of clean) {
      const res = await deleteEntry(def, id, actor);
      if (res.ok) changed++;
      else if (res.message) skipped.push(res.message);
    }
    return { changed, skipped };
  }
  if (op === "publish") {
    const publishedAt = def.fields.some((f) => f.name === "published_at") ? ", published_at = COALESCE(published_at, ?)" : "";
    const res = await run(
      `UPDATE ${def.table} SET status = 'published', updated_at = ?${publishedAt} WHERE id IN (${marks})`,
      publishedAt ? [now, now, ...clean] : [now, ...clean],
    );
    changed = res.changes;
  } else if (op === "draft") {
    changed = (await run(`UPDATE ${def.table} SET status = 'draft', updated_at = ? WHERE id IN (${marks})`, [now, ...clean])).changes;
  } else if (def.factCheck && op === "verify") {
    changed = (
      await run(`UPDATE ${def.table} SET fact_check = 'verified', reviewed_at = ?, edited = 1, updated_at = ? WHERE id IN (${marks})`, [now, now, ...clean])
    ).changes;
  } else if (def.factCheck && op === "unverify") {
    changed = (await run(`UPDATE ${def.table} SET fact_check = 'pending', edited = 1, updated_at = ? WHERE id IN (${marks})`, [now, ...clean])).changes;
  }
  if (changed) await logActivity(actor, op, def.key, "", `${changed} ${changed === 1 ? def.singular : def.plural.toLowerCase()}`);
  return { changed, skipped };
}
