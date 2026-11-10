/**
 * The autopilot: a queue of topics that Claude turns into article drafts.
 *
 * A draft is saved like any other article (through the same validation as the
 * admin form), marked as an autopilot draft and as pending a fact check. By
 * default it stays hidden until an editor publishes it.
 */
import { z } from "zod";
import stickerList from "../../../content/stickers.json";
import { logActivity } from "@/lib/activity";
import { getCollection } from "@/lib/admin/collections";
import { loadSettingsFresh } from "@/lib/admin/settings-store";
import { saveEntry } from "@/lib/admin/store";
import { ARTICLE_KINDS, countWords, slugify } from "@/lib/content/schema";
import { json, query, queryOne, run } from "@/lib/db";
import { TOOLS } from "@/lib/tools";
import { AutopilotError, autopilotConfigured, research, structured, type Usage } from "./claude";
import { draftPrompt, researchPrompt, topicsPrompt, writerSystem, type Catalog } from "./prompt";

export { autopilotConfigured } from "./claude";

export type TopicStatus = "queued" | "drafting" | "done" | "failed";

export type DraftReport = {
  model: string;
  servedBy: string;
  researched: boolean;
  researchError?: string;
  searches: number;
  inputTokens: number;
  outputTokens: number;
  words: number;
  /** Things the editor should look at before publishing. */
  warnings: string[];
  editorNotes: string;
};

export type Topic = {
  id: number;
  topic: string;
  category: string;
  notes: string;
  status: TopicStatus;
  articleId: number | null;
  error: string;
  report: DraftReport | null;
  createdAt: string;
  updatedAt: string;
};

const ACTOR = "Autopilot";

/* ------------------------------------------------------------------ */
/* Queue                                                               */
/* ------------------------------------------------------------------ */

export async function listTopics(limit = 100): Promise<Topic[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT id, topic, category, notes, status, article_id, error, report, created_at, updated_at FROM autopilot_topics
     ORDER BY CASE status WHEN 'drafting' THEN 0 WHEN 'queued' THEN 1 WHEN 'failed' THEN 2 ELSE 3 END,
              CASE WHEN status IN ('queued', 'drafting') THEN id END ASC, updated_at DESC LIMIT ?`,
    [limit],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    topic: String(r.topic),
    category: String(r.category),
    notes: String(r.notes),
    status: String(r.status) as TopicStatus,
    articleId: r.article_id == null ? null : Number(r.article_id),
    error: String(r.error),
    report: json<DraftReport | null>(r.report, null),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  }));
}

export async function addTopic(input: { topic: string; category?: string; notes?: string }, actor: string): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  const topic = input.topic.replace(/\s+/g, " ").trim().slice(0, 200);
  const notes = (input.notes ?? "").trim().slice(0, 2000);
  let category = (input.category ?? "").trim();
  if (topic.length < 8) return { ok: false, message: "Describe the topic in at least a few words." };
  if (category && !(await queryOne("SELECT id FROM categories WHERE slug = ?", [category]))) category = "";
  const res = await run("INSERT INTO autopilot_topics (topic, category, notes) VALUES (?, ?, ?)", [topic, category, notes]);
  await logActivity(actor, "queued", "autopilot topic", res.lastId, topic);
  return { ok: true, id: res.lastId };
}

export async function removeTopic(id: number): Promise<void> {
  await run("DELETE FROM autopilot_topics WHERE id = ? AND status != 'drafting'", [id]);
}

export async function requeueTopic(id: number): Promise<void> {
  await run("UPDATE autopilot_topics SET status = 'queued', error = '', updated_at = ? WHERE id = ? AND status = 'failed'", [new Date().toISOString(), id]);
}

/* ------------------------------------------------------------------ */
/* Drafting                                                            */
/* ------------------------------------------------------------------ */

async function loadCatalog(): Promise<Catalog> {
  const [categories, articles] = await Promise.all([
    query<{ slug: string; name: string; description: string; sticker: string }>(
      "SELECT slug, name, description, sticker FROM categories WHERE status = 'published' ORDER BY sort_order, name",
    ),
    query<{ slug: string; title: string; category: string }>("SELECT slug, title, category FROM articles ORDER BY category, title"),
  ]);
  return { categories, articles, stickers: (stickerList as { ids: string[] }).ids, tools: TOOLS.map((t) => t.slug) };
}

function draftSchema(catalog: Catalog) {
  const slugs = catalog.categories.map((c) => c.slug) as [string, ...string[]];
  return z.object({
    title: z.string(),
    dek: z.string(),
    summary: z.string(),
    category: z.enum(slugs),
    kind: z.enum(ARTICLE_KINDS),
    sticker: z.string(),
    tags: z.array(z.string()),
    takeaways: z.array(z.string()),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })),
    sources: z.array(z.object({ title: z.string(), publisher: z.string(), url: z.string(), year: z.number() })),
    body: z.string(),
    editor_notes: z.string(),
  });
}

const normalizeUrl = (url: string) => url.trim().replace(/#.*$/, "").replace(/\/+$/, "").toLowerCase();

/** Problems an editor should know about. None of them blocks saving the draft. */
function reviewDraft(draft: z.infer<ReturnType<typeof draftSchema>>, seenUrls: string[] | null): string[] {
  const warnings: string[] = [];
  const words = countWords(draft.body);
  if (words < 800 || words > 2000) warnings.push(`The article is ${words} words; the house range is 900 to 1,500.`);
  if (!/^## the bottom line\s*$/im.test(draft.body)) warnings.push("There is no “The bottom line” section at the end.");
  if (/^# /m.test(draft.body)) warnings.push("The body uses a top-level “#” heading; use “##”.");
  const cited = new Set([...draft.body.matchAll(/\[\^(\d+)\]/g)].map((m) => Number(m[1])));
  const outOfRange = [...cited].filter((n) => n < 1 || n > draft.sources.length);
  if (outOfRange.length) warnings.push(`The text cites source number ${outOfRange.join(", ")}, which is not in the sources list.`);
  if (cited.size < 4) warnings.push(`Only ${cited.size} different sources are cited in the text; aim for at least four.`);
  if (/https?:\/\//.test(draft.body)) warnings.push("The body contains an external link; links to other sites belong in the sources list.");
  if (seenUrls) {
    const seen = new Set(seenUrls.map(normalizeUrl));
    const unseen = draft.sources.filter((s) => !seen.has(normalizeUrl(s.url)));
    if (unseen.length) {
      warnings.push(`${unseen.length} source ${unseen.length === 1 ? "link was" : "links were"} not among the search results, so open ${unseen.length === 1 ? "it" : "them"} before publishing: ${unseen.map((s) => s.url).join(" , ")}`);
    }
  } else {
    warnings.push("Written without live research. Every figure and link needs checking against its source.");
  }
  return warnings;
}

async function freeSlug(title: string): Promise<string> {
  const base = slugify(title) || "article";
  let slug = base;
  for (let n = 2; await queryOne("SELECT id FROM articles WHERE slug = ?", [slug]); n++) slug = `${base.slice(0, 74)}-${n}`;
  return slug;
}

type RunSettings = { model: string; research: boolean; autoPublish: boolean; guidance: string };

/** The two Claude calls, replaceable so tests can run without the API. */
export type Engine = { research: typeof research; structured: typeof structured };
const liveEngine: Engine = { research, structured };

async function draftTopic(topic: Topic, settings: RunSettings, catalog: Catalog, engine: Engine): Promise<{ articleId: number; report: DraftReport }> {
  const usage: Usage = { inputTokens: 0, outputTokens: 0, searches: 0 };
  const add = (u: Usage) => {
    usage.inputTokens += u.inputTokens;
    usage.outputTokens += u.outputTokens;
    usage.searches += u.searches;
  };

  // Step 1: research. A failed search is not fatal: the draft falls back to the stricter no-search rules.
  let notes: string | null = null;
  let seenUrls: string[] | null = null;
  let researchError: string | undefined;
  if (settings.research) {
    try {
      const found = await engine.research(settings.model, researchPrompt(topic.topic, topic.notes));
      add(found.usage);
      notes = found.notes;
      seenUrls = found.urls;
    } catch (error) {
      if (error instanceof AutopilotError && error.fatal) throw error;
      researchError = error instanceof Error ? error.message : "Research failed.";
    }
  }

  // Step 2: write.
  const schema = draftSchema(catalog);
  const result = await engine.structured({
    model: settings.model,
    system: writerSystem(catalog),
    prompt: draftPrompt({ topic: topic.topic, notes: topic.notes, guidance: settings.guidance, research: notes, category: topic.category, catalog }),
    schema,
    effort: "high",
  });
  add(result.usage);
  const draft = result.value;

  const warnings = reviewDraft(draft, seenUrls);
  if (researchError) warnings.unshift(`The research step failed (${researchError}), so this was written from memory.`);
  const category = catalog.categories.find((c) => c.slug === draft.category) ?? catalog.categories[0];
  const def = getCollection("articles")!;
  const saved = await saveEntry({
    def,
    id: null,
    actor: ACTOR,
    origin: "autopilot",
    raw: {
      title: draft.title.trim().slice(0, 120),
      slug: await freeSlug(draft.title),
      dek: draft.dek.trim().slice(0, 260),
      summary: draft.summary.trim().slice(0, 200),
      body: draft.body,
      category: category.slug,
      kind: draft.kind,
      sticker: catalog.stickers.includes(draft.sticker) ? draft.sticker : category.sticker,
      tags: draft.tags.map((t) => t.toLowerCase().trim()).filter(Boolean).slice(0, 7),
      takeaways: draft.takeaways.slice(0, 5),
      faqs: draft.faqs.slice(0, 5),
      // A year of 0 means "unknown"; sources without a usable https link are dropped and flagged.
      sources: draft.sources.filter((s) => /^https:\/\/\S+$/.test(s.url.trim())).map((s) => ({ ...s, url: s.url.trim(), year: s.year >= 1900 ? s.year : "" })),
      related: [],
      status: settings.autoPublish ? "published" : "draft",
      fact_check: "pending",
      featured: false,
      author: "Health Maxxing Editors",
    },
  });
  if (!saved.ok) throw new AutopilotError(`The draft could not be saved: ${saved.message ?? Object.entries(saved.errors).map(([k, v]) => `${k}: ${v}`).join("; ")}`);
  if (draft.sources.some((s) => !/^https:\/\/\S+$/.test(s.url.trim()))) warnings.push("One or more sources had no usable link and were dropped; check the citation numbers.");

  return {
    articleId: saved.id,
    report: {
      model: settings.model,
      servedBy: result.servedBy,
      researched: notes !== null,
      researchError,
      searches: usage.searches,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      words: countWords(draft.body),
      warnings,
      editorNotes: draft.editor_notes.trim().slice(0, 2000),
    },
  };
}

export type RunSummary = { drafted: number; failed: number; suggested: number; messages: string[]; articleIds: number[] };

/**
 * Draft up to `max` queued topics (default: the "articles per run" setting).
 * Safe to call from a cron job: each topic is claimed before work starts, so
 * two overlapping runs never draft the same one.
 */
export async function runAutopilot(opts: { max?: number; actor?: string; engine?: Engine } = {}): Promise<RunSummary> {
  const summary: RunSummary = { drafted: 0, failed: 0, suggested: 0, messages: [], articleIds: [] };
  const engine = opts.engine ?? liveEngine;
  if (!autopilotConfigured()) {
    summary.messages.push("ANTHROPIC_API_KEY is not set on the server, so the autopilot cannot run.");
    return summary;
  }
  const settings = (await loadSettingsFresh()).autopilot;
  const max = Math.min(5, Math.max(1, opts.max ?? settings.perRun));
  const now = () => new Date().toISOString();

  // A run that died mid-draft leaves its topic "drafting"; put those back after half an hour.
  await run("UPDATE autopilot_topics SET status = 'queued', updated_at = ? WHERE status = 'drafting' AND updated_at < ?", [
    now(),
    new Date(Date.now() - 30 * 60_000).toISOString(),
  ]);

  let catalog = await loadCatalog();
  if (!catalog.categories.length) {
    summary.messages.push("There are no published topics to file articles under.");
    return summary;
  }

  const waiting = (await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM autopilot_topics WHERE status = 'queued'"))?.n ?? 0;
  if (!waiting && settings.autoTopics) {
    try {
      summary.suggested = await suggestTopics(max, opts.actor ?? ACTOR, catalog, settings, engine);
    } catch (error) {
      summary.messages.push(error instanceof Error ? error.message : "Could not suggest topics.");
      return summary;
    }
  }

  for (let i = 0; i < max; i++) {
    const next = await queryOne<{ id: number }>("SELECT id FROM autopilot_topics WHERE status = 'queued' ORDER BY id LIMIT 1");
    if (!next) break;
    const claimed = await run("UPDATE autopilot_topics SET status = 'drafting', error = '', updated_at = ? WHERE id = ? AND status = 'queued'", [now(), next.id]);
    if (!claimed.changes) continue;
    const topic = (await listTopics(500)).find((t) => t.id === next.id);
    if (!topic) continue;
    try {
      const { articleId, report } = await draftTopic(topic, settings, catalog, engine);
      await run("UPDATE autopilot_topics SET status = 'done', article_id = ?, report = ?, error = '', updated_at = ? WHERE id = ?", [articleId, JSON.stringify(report), now(), topic.id]);
      await logActivity(opts.actor ?? ACTOR, settings.autoPublish ? "drafted and published" : "drafted", "articles", articleId, topic.topic);
      summary.drafted++;
      summary.articleIds.push(articleId);
      catalog = await loadCatalog();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await run("UPDATE autopilot_topics SET status = 'failed', error = ?, updated_at = ? WHERE id = ?", [message.slice(0, 1000), now(), topic.id]);
      summary.failed++;
      summary.messages.push(`“${topic.topic}”: ${message}`);
      // A rejected key or a rate limit will fail every topic, so stop here.
      if (error instanceof AutopilotError && error.fatal) break;
    }
  }
  if (!summary.drafted && !summary.failed && !summary.messages.length) summary.messages.push("The queue is empty. Add a topic first.");
  return summary;
}

/** Ask Claude for topics the site does not cover yet and add them to the queue. */
export async function suggestTopics(count: number, actor: string, catalog?: Catalog, settings?: { model: string; guidance: string }, engine: Engine = liveEngine): Promise<number> {
  if (!autopilotConfigured()) throw new AutopilotError("ANTHROPIC_API_KEY is not set on the server.", true);
  const cat = catalog ?? (await loadCatalog());
  const conf = settings ?? (await loadSettingsFresh()).autopilot;
  const wanted = Math.min(10, Math.max(1, count));
  const slugs = cat.categories.map((c) => c.slug) as [string, ...string[]];
  const result = await engine.structured({
    model: conf.model,
    system: "You are the commissioning editor of Health Maxxing, an evidence-based health magazine. You propose article topics that are useful, answerable from good evidence, and not already covered.",
    prompt: topicsPrompt(wanted, cat, conf.guidance),
    schema: z.object({ topics: z.array(z.object({ topic: z.string(), category: z.enum(slugs), notes: z.string() })) }),
    effort: "medium",
  });
  let added = 0;
  for (const t of result.value.topics.slice(0, wanted)) {
    const res = await addTopic({ topic: t.topic, category: t.category, notes: t.notes }, actor);
    if (res.ok) added++;
  }
  return added;
}
