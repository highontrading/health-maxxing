/**
 * Cached read access to published content. Everything public pages render
 * comes through here, so every function is a `use cache` scope with a tag.
 * Mutations call `invalidate()` (see lib/cache-tags.ts) with the same tags.
 *
 * Next.js only: this file relies on the `use cache` directive.
 */
import { cacheLife, cacheTag } from "next/cache";
import { json, query, queryOne } from "./db";
import { mergeSettings, type SiteSettings } from "./settings";
import { TOOLS } from "./tools";
import { markdownToText } from "./markdown";
import type {
  Article,
  ArticleCard,
  BodySystem,
  Category,
  ColorKey,
  Condition,
  ConditionCard,
  Exercise,
  Faq,
  Food,
  GlossaryTerm,
  Micro,
  Myth,
  NewsletterIssue,
  SearchDoc,
  SiteStats,
  Source,
  StaticPage,
} from "./types";

type R = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const n = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

const LIVE = "status = 'published' AND (published_at IS NULL OR published_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now'))";
const LIVE_A = LIVE.replace("status", "a.status").replace(/published_at/g, "a.published_at");
const CARD_COLS =
  "slug, title, dek, summary, category, sticker, kind, featured, reading_minutes, published_at, cover_image, tags";

function toCard(r: R): ArticleCard {
  return {
    slug: s(r.slug),
    title: s(r.title),
    dek: s(r.dek),
    summary: s(r.summary),
    category: s(r.category),
    sticker: s(r.sticker),
    kind: s(r.kind),
    featured: n(r.featured) === 1,
    readingMinutes: n(r.reading_minutes),
    publishedAt: r.published_at ? s(r.published_at) : null,
    coverImage: s(r.cover_image),
    tags: json<string[]>(r.tags, []),
  };
}

function toArticle(r: R): Article {
  return {
    ...toCard(r),
    body: s(r.body),
    takeaways: json<string[]>(r.takeaways, []),
    faqs: json<Faq[]>(r.faqs, []),
    sources: json<Source[]>(r.sources, []),
    related: json<string[]>(r.related, []),
    author: s(r.author),
    reviewedAt: r.reviewed_at ? s(r.reviewed_at) : null,
    updatedAt: s(r.updated_at),
    wordCount: n(r.word_count),
    coverAlt: s(r.cover_alt),
    coverCredit: s(r.cover_credit),
    seoTitle: s(r.seo_title),
    seoDescription: s(r.seo_description),
    factCheck: s(r.fact_check),
  };
}

function toConditionCard(r: R): ConditionCard {
  return {
    slug: s(r.slug),
    name: s(r.name),
    aka: json<string[]>(r.aka, []),
    system: s(r.system),
    category: s(r.category),
    summary: s(r.summary),
  };
}

/* ------------------------------------------------------------------ */
/* Settings and taxonomy                                               */
/* ------------------------------------------------------------------ */

export async function getSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag("settings");
  const rows = await query<{ key: string; value: string }>("SELECT key, value FROM settings");
  const stored: Record<string, unknown> = {};
  for (const row of rows) stored[row.key] = json<unknown>(row.value, null);
  return mergeSettings(stored);
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("categories", "articles");
  const rows = await query<R>(
    `SELECT c.slug, c.name, c.tagline, c.description, c.color, c.sticker, c.sort_order,
            (SELECT COUNT(*) FROM articles a WHERE a.category = c.slug AND ${LIVE_A}) AS article_count
     FROM categories c WHERE c.status = 'published' ORDER BY c.sort_order, c.name`,
  );
  return rows.map((r) => ({
    slug: s(r.slug),
    name: s(r.name),
    tagline: s(r.tagline),
    description: s(r.description),
    color: s(r.color) as ColorKey,
    sticker: s(r.sticker),
    order: n(r.sort_order),
    articleCount: n(r.article_count),
  }));
}

export async function getCategory(slug: string): Promise<Category | null> {
  const all = await getCategories();
  return all.find((c) => c.slug === slug) ?? null;
}

export async function getBodySystems(): Promise<BodySystem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("body-systems", "conditions");
  const rows = await query<R>(
    `SELECT b.slug, b.name, b.description, b.color, b.sticker, b.organs, b.categories, b.sort_order,
            (SELECT COUNT(*) FROM conditions c WHERE c.system = b.slug AND c.status = 'published') AS condition_count
     FROM body_systems b WHERE b.status = 'published' ORDER BY b.sort_order, b.name`,
  );
  return rows.map((r) => ({
    slug: s(r.slug),
    name: s(r.name),
    description: s(r.description),
    color: s(r.color) as ColorKey,
    sticker: s(r.sticker),
    organs: json<string[]>(r.organs, []),
    categories: json<string[]>(r.categories, []),
    order: n(r.sort_order),
    conditionCount: n(r.condition_count),
  }));
}

/* ------------------------------------------------------------------ */
/* Articles                                                            */
/* ------------------------------------------------------------------ */

export async function listArticles(opts: { category?: string; limit?: number; featured?: boolean } = {}): Promise<ArticleCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");
  const where = [LIVE];
  const args: (string | number)[] = [];
  if (opts.category) {
    where.push("category = ?");
    args.push(opts.category);
  }
  if (opts.featured) where.push("featured = 1");
  args.push(opts.limit ?? 500);
  const rows = await query<R>(
    `SELECT ${CARD_COLS} FROM articles WHERE ${where.join(" AND ")} ORDER BY published_at DESC, sort_order ASC LIMIT ?`,
    args,
  );
  return rows.map(toCard);
}

export async function getArticle(slug: string): Promise<Article | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");
  const row = await queryOne<R>(`SELECT * FROM articles WHERE slug = ? AND ${LIVE}`, [slug]);
  return row ? toArticle(row) : null;
}

export async function getArticleSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");
  const rows = await query<{ slug: string }>(`SELECT slug FROM articles WHERE ${LIVE} ORDER BY published_at DESC`);
  return rows.map((r) => r.slug);
}

/** Related reads: explicit picks first, then same category, then shared tags. */
export async function getRelatedArticles(slug: string, limit = 3): Promise<ArticleCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");
  const article = await queryOne<R>(`SELECT slug, category, related, tags FROM articles WHERE slug = ?`, [slug]);
  if (!article) return [];
  const all = (await query<R>(`SELECT ${CARD_COLS} FROM articles WHERE ${LIVE} AND slug != ?`, [slug])).map(toCard);
  const picks = json<string[]>(article.related, []);
  const tags = new Set(json<string[]>(article.tags, []));
  const scored = all
    .map((a) => ({
      a,
      score:
        (picks.includes(a.slug) ? 100 - picks.indexOf(a.slug) : 0) +
        (a.category === article.category ? 5 : 0) +
        a.tags.filter((t) => tags.has(t)).length * 3,
    }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score);
  return scored.slice(0, limit).map((x) => x.a);
}

export async function getPopularArticles(limit = 6): Promise<ArticleCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");
  const rows = await query<R>(
    `SELECT ${CARD_COLS} FROM articles WHERE ${LIVE} ORDER BY views DESC, featured DESC, published_at DESC LIMIT ?`,
    [limit],
  );
  return rows.map(toCard);
}

/* ------------------------------------------------------------------ */
/* Conditions                                                          */
/* ------------------------------------------------------------------ */

export async function listConditions(system?: string): Promise<ConditionCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("conditions");
  const rows = system
    ? await query<R>(
        "SELECT slug, name, aka, system, category, summary FROM conditions WHERE status = 'published' AND system = ? ORDER BY name COLLATE NOCASE",
        [system],
      )
    : await query<R>(
        "SELECT slug, name, aka, system, category, summary FROM conditions WHERE status = 'published' ORDER BY name COLLATE NOCASE",
      );
  return rows.map(toConditionCard);
}

export async function listConditionsByCategory(category: string, limit = 12): Promise<ConditionCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("conditions");
  const rows = await query<R>(
    "SELECT slug, name, aka, system, category, summary FROM conditions WHERE status = 'published' AND category = ? ORDER BY name COLLATE NOCASE LIMIT ?",
    [category, limit],
  );
  return rows.map(toConditionCard);
}

export async function getCondition(slug: string): Promise<Condition | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("conditions");
  const r = await queryOne<R>("SELECT * FROM conditions WHERE slug = ? AND status = 'published'", [slug]);
  if (!r) return null;
  return {
    ...toConditionCard(r),
    symptoms: json<string[]>(r.symptoms, []),
    urgent: json<string[]>(r.urgent, []),
    body: s(r.body),
    sources: json<Source[]>(r.sources, []),
    reviewedAt: r.reviewed_at ? s(r.reviewed_at) : null,
    updatedAt: s(r.updated_at),
    factCheck: s(r.fact_check),
  };
}

export async function getConditionSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("conditions");
  return (await query<{ slug: string }>("SELECT slug FROM conditions WHERE status = 'published'")).map((r) => r.slug);
}

/* ------------------------------------------------------------------ */
/* Reference collections                                               */
/* ------------------------------------------------------------------ */

export async function listGlossary(): Promise<GlossaryTerm[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("glossary");
  const rows = await query<R>(
    "SELECT slug, term, definition, category, see_also FROM glossary WHERE status = 'published' ORDER BY term COLLATE NOCASE",
  );
  return rows.map((r) => ({
    slug: s(r.slug),
    term: s(r.term),
    definition: s(r.definition),
    category: s(r.category),
    seeAlso: json<string[]>(r.see_also, []),
  }));
}

export async function listMyths(category?: string): Promise<Myth[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("myths");
  const rows = category
    ? await query<R>("SELECT * FROM myths WHERE status = 'published' AND category = ? ORDER BY sort_order, id", [category])
    : await query<R>("SELECT * FROM myths WHERE status = 'published' ORDER BY sort_order, id");
  return rows.map((r) => ({
    slug: s(r.slug),
    myth: s(r.myth),
    verdict: s(r.verdict) as Myth["verdict"],
    answer: s(r.answer),
    explanation: s(r.explanation),
    category: s(r.category),
    sticker: s(r.sticker),
    sources: json<Source[]>(r.sources, []),
  }));
}

function toFood(r: R): Food {
  return {
    slug: s(r.slug),
    name: s(r.name),
    group: s(r.food_group),
    fdcId: r.fdc_id == null ? null : n(r.fdc_id),
    servingLabel: s(r.serving_label),
    servingGrams: n(r.serving_grams),
    kcal: n(r.kcal),
    protein: n(r.protein),
    carbs: n(r.carbs),
    fiber: n(r.fiber),
    sugars: n(r.sugars),
    fat: n(r.fat),
    satFat: n(r.sat_fat),
    sodiumMg: n(r.sodium_mg),
    micros: json<Micro[]>(r.micros, []),
    note: s(r.note),
  };
}

export async function listFoods(): Promise<Food[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("foods");
  return (await query<R>("SELECT * FROM foods WHERE status = 'published' ORDER BY name COLLATE NOCASE")).map(toFood);
}

export async function getFood(slug: string): Promise<Food | null> {
  const all = await listFoods();
  return all.find((f) => f.slug === slug) ?? null;
}

function toExercise(r: R): Exercise {
  return {
    slug: s(r.slug),
    name: s(r.name),
    type: s(r.type),
    pattern: s(r.pattern),
    primary: json<string[]>(r.primary_muscles, []),
    secondary: json<string[]>(r.secondary_muscles, []),
    equipment: json<string[]>(r.equipment, []),
    level: s(r.level),
    summary: s(r.summary),
    steps: json<string[]>(r.steps, []),
    cues: json<string[]>(r.cues, []),
    mistakes: json<string[]>(r.mistakes, []),
    easier: s(r.easier),
    harder: s(r.harder),
  };
}

export async function listExercises(): Promise<Exercise[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("exercises");
  return (await query<R>("SELECT * FROM exercises WHERE status = 'published' ORDER BY name COLLATE NOCASE")).map(toExercise);
}

export async function getExercise(slug: string): Promise<Exercise | null> {
  const all = await listExercises();
  return all.find((e) => e.slug === slug) ?? null;
}

/* ------------------------------------------------------------------ */
/* Pages and newsletter                                                */
/* ------------------------------------------------------------------ */

export async function getPage(slug: string): Promise<StaticPage | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("pages");
  const r = await queryOne<R>("SELECT slug, title, description, body, updated_at FROM pages WHERE slug = ? AND status = 'published'", [slug]);
  return r
    ? { slug: s(r.slug), title: s(r.title), description: s(r.description), body: s(r.body), updatedAt: s(r.updated_at) }
    : null;
}

export async function getPageSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("pages");
  return (await query<{ slug: string }>("SELECT slug FROM pages WHERE status = 'published'")).map((r) => r.slug);
}

function toIssue(r: R): NewsletterIssue {
  return {
    slug: s(r.slug),
    number: n(r.number),
    title: s(r.title),
    preheader: s(r.preheader),
    sticker: s(r.sticker),
    body: s(r.body),
    publishedAt: r.published_at ? s(r.published_at) : null,
  };
}

export async function listNewsletterIssues(): Promise<NewsletterIssue[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("newsletter");
  return (
    await query<R>("SELECT * FROM newsletter_issues WHERE status = 'published' ORDER BY number DESC, published_at DESC")
  ).map(toIssue);
}

export async function getNewsletterIssue(slug: string): Promise<NewsletterIssue | null> {
  const all = await listNewsletterIssues();
  return all.find((i) => i.slug === slug) ?? null;
}

/* ------------------------------------------------------------------ */
/* Counts and search                                                   */
/* ------------------------------------------------------------------ */

export async function getSiteStats(): Promise<SiteStats> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles", "conditions", "glossary", "myths", "foods", "exercises", "categories");
  const r = await queryOne<R>(
    `SELECT
      (SELECT COUNT(*) FROM articles WHERE ${LIVE}) AS articles,
      (SELECT COUNT(*) FROM conditions WHERE status = 'published') AS conditions,
      (SELECT COUNT(*) FROM glossary WHERE status = 'published') AS glossary,
      (SELECT COUNT(*) FROM myths WHERE status = 'published') AS myths,
      (SELECT COUNT(*) FROM foods WHERE status = 'published') AS foods,
      (SELECT COUNT(*) FROM exercises WHERE status = 'published') AS exercises,
      (SELECT COUNT(*) FROM categories WHERE status = 'published') AS categories`,
  );
  return {
    articles: n(r?.articles),
    conditions: n(r?.conditions),
    glossary: n(r?.glossary),
    myths: n(r?.myths),
    foods: n(r?.foods),
    exercises: n(r?.exercises),
    categories: n(r?.categories),
    tools: TOOLS.length,
  };
}

/** Everything searchable, flattened. Kept small: body text is trimmed. */
export async function getSearchIndex(): Promise<SearchDoc[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles", "conditions", "glossary", "myths", "foods", "exercises", "categories");
  const docs: SearchDoc[] = [];

  for (const r of await query<R>(`SELECT slug, title, dek, summary, category, sticker, tags, body FROM articles WHERE ${LIVE}`)) {
    docs.push({
      type: "article",
      slug: s(r.slug),
      href: `/articles/${s(r.slug)}`,
      title: s(r.title),
      summary: s(r.summary) || s(r.dek),
      category: s(r.category),
      sticker: s(r.sticker),
      keywords: json<string[]>(r.tags, []).join(" "),
      text: markdownToText(s(r.body)).slice(0, 4000).toLowerCase(),
    });
  }
  for (const r of await query<R>("SELECT slug, name, aka, summary, category, system, symptoms, body FROM conditions WHERE status = 'published'")) {
    docs.push({
      type: "condition",
      slug: s(r.slug),
      href: `/conditions/${s(r.slug)}`,
      title: s(r.name),
      summary: s(r.summary),
      category: s(r.category),
      sticker: "",
      keywords: [...json<string[]>(r.aka, []), ...json<string[]>(r.symptoms, [])].join(" "),
      text: markdownToText(s(r.body)).slice(0, 2500).toLowerCase(),
    });
  }
  for (const r of await query<R>("SELECT slug, term, definition, category FROM glossary WHERE status = 'published'")) {
    docs.push({
      type: "term",
      slug: s(r.slug),
      href: `/glossary#${s(r.slug)}`,
      title: s(r.term),
      summary: s(r.definition),
      category: s(r.category),
      sticker: "",
      keywords: "",
      text: "",
    });
  }
  for (const r of await query<R>("SELECT slug, myth, answer, category, sticker FROM myths WHERE status = 'published'")) {
    docs.push({
      type: "myth",
      slug: s(r.slug),
      href: `/myths#${s(r.slug)}`,
      title: s(r.myth),
      summary: s(r.answer),
      category: s(r.category),
      sticker: s(r.sticker),
      keywords: "myth fact",
      text: "",
    });
  }
  for (const r of await query<R>("SELECT slug, name, food_group, note, kcal, protein FROM foods WHERE status = 'published'")) {
    docs.push({
      type: "food",
      slug: s(r.slug),
      href: `/foods/${s(r.slug)}`,
      title: s(r.name),
      summary: `${Math.round(n(r.kcal))} kcal and ${n(r.protein)} g protein per 100 g. ${s(r.note)}`,
      category: "nutrition",
      sticker: "",
      keywords: `${s(r.food_group)} nutrition calories protein`,
      text: "",
    });
  }
  for (const r of await query<R>("SELECT slug, name, type, summary, primary_muscles, equipment FROM exercises WHERE status = 'published'")) {
    docs.push({
      type: "exercise",
      slug: s(r.slug),
      href: `/exercises/${s(r.slug)}`,
      title: s(r.name),
      summary: s(r.summary),
      category: "fitness",
      sticker: "",
      keywords: [...json<string[]>(r.primary_muscles, []), ...json<string[]>(r.equipment, []), s(r.type)].join(" "),
      text: "",
    });
  }
  for (const r of await query<R>("SELECT slug, name, tagline, description, sticker FROM categories WHERE status = 'published'")) {
    docs.push({
      type: "topic",
      slug: s(r.slug),
      href: `/topics/${s(r.slug)}`,
      title: s(r.name),
      summary: s(r.description),
      category: s(r.slug),
      sticker: s(r.sticker),
      keywords: s(r.tagline),
      text: "",
    });
  }
  for (const t of TOOLS) {
    docs.push({
      type: "tool",
      slug: t.slug,
      href: `/tools/${t.slug}`,
      title: t.name,
      summary: t.summary,
      category: t.category,
      sticker: t.sticker,
      keywords: t.keywords,
      text: "",
    });
  }
  return docs;
}

/* ------------------------------------------------------------------ */
/* Sitemap                                                             */
/* ------------------------------------------------------------------ */

export type SitemapEntry = { path: string; updatedAt: string | null };

/** Every public, indexable page that comes from the database. */
export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles", "conditions", "categories", "body-systems", "foods", "exercises", "pages", "newsletter", "forum-boards");
  const sets: [string, string][] = [
    ["/articles/", `SELECT slug, updated_at FROM articles WHERE ${LIVE}`],
    ["/conditions/", "SELECT slug, updated_at FROM conditions WHERE status = 'published'"],
    ["/topics/", "SELECT slug, updated_at FROM categories WHERE status = 'published'"],
    ["/body/", "SELECT slug, updated_at FROM body_systems WHERE status = 'published'"],
    ["/foods/", "SELECT slug, updated_at FROM foods WHERE status = 'published'"],
    ["/exercises/", "SELECT slug, updated_at FROM exercises WHERE status = 'published'"],
    ["/newsletter/", "SELECT slug, updated_at FROM newsletter_issues WHERE status = 'published'"],
    ["/community/", "SELECT slug, updated_at FROM forum_boards WHERE status = 'published'"],
    ["/", "SELECT slug, updated_at FROM pages WHERE status = 'published'"],
  ];
  const out: SitemapEntry[] = [];
  for (const [prefix, sql] of sets) {
    for (const r of await query<{ slug: string; updated_at: string | null }>(sql)) out.push({ path: `${prefix}${r.slug}`, updatedAt: r.updated_at });
  }
  return out;
}
