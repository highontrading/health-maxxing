/**
 * Reads the `content/` folder into typed objects and reports problems.
 * Used by the validator CLI and by the database sync. Runs under tsx or Next.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import {
  CALLOUT_TYPES,
  CONDITION_SECTIONS,
  articleFrontmatterSchema,
  bodySystemSchema,
  categorySchema,
  conditionFrontmatterSchema,
  countWords,
  exerciseSchema,
  foodSchema,
  forumBoardSchema,
  forumThreadSchema,
  glossaryTermSchema,
  mythSchema,
  newsletterFrontmatterSchema,
  pageFrontmatterSchema,
  readingMinutes,
  slugify,
  type ArticleFrontmatter,
  type BodySystem,
  type Category,
  type ConditionFrontmatter,
  type Exercise,
  type Food,
  type ForumBoardSeed,
  type ForumThreadSeed,
  type GlossaryTerm,
  type Myth,
  type NewsletterFrontmatter,
  type PageFrontmatter,
} from "./schema";

export type Issue = { level: "error" | "warn"; file: string; message: string };

export type PlanArticle = {
  category: string;
  slug: string;
  title: string;
  sticker: string;
  kind: string;
  featured?: boolean;
  brief: string;
};
export type PlanCondition = { slug: string; name: string; system: string; category: string };
export type Plan = { tools: string[]; articles: PlanArticle[]; conditions: PlanCondition[] };

export type LoadedArticle = ArticleFrontmatter & {
  slug: string;
  body: string;
  words: number;
  readingMinutes: number;
  order: number;
  file: string;
};
export type LoadedCondition = ConditionFrontmatter & {
  slug: string;
  body: string;
  words: number;
  file: string;
};
export type LoadedNewsletter = NewsletterFrontmatter & { slug: string; body: string; file: string };
export type LoadedPage = PageFrontmatter & { slug: string; body: string; file: string };

export type LoadedContent = {
  root: string;
  categories: Category[];
  bodySystems: BodySystem[];
  stickers: string[];
  plan: Plan;
  site: Record<string, unknown>;
  articles: LoadedArticle[];
  conditions: LoadedCondition[];
  glossary: (GlossaryTerm & { slug: string })[];
  myths: (Myth & { slug: string })[];
  foods: (Food & { slug: string })[];
  exercises: (Exercise & { slug: string })[];
  newsletter: LoadedNewsletter[];
  pages: LoadedPage[];
  forumBoards: ForumBoardSeed[];
  forumThreads: ForumThreadSeed[];
  issues: Issue[];
};

const STATIC_PATHS = new Set([
  "/",
  "/articles",
  "/topics",
  "/conditions",
  "/body",
  "/tools",
  "/exercises",
  "/foods",
  "/myths",
  "/glossary",
  "/newsletter",
  "/community",
  "/search",
  "/about",
  "/editorial-policy",
  "/medical-disclaimer",
  "/privacy",
  "/terms",
  "/contact",
  "/community-guidelines",
]);

/** Publishers we expect to see. Anything else only triggers a warning. */
const TRUSTED_HOSTS = [
  "who.int",
  "cdc.gov",
  "nih.gov",
  "medlineplus.gov",
  "fda.gov",
  "usda.gov",
  "health.gov",
  "dietaryguidelines.gov",
  "realfood.gov",
  "ihi.org",
  "uspreventiveservicestaskforce.org",
  "ahrq.gov",
  "cancer.gov",
  "nhs.uk",
  "nice.org.uk",
  "gov.uk",
  "europa.eu",
  "canada.ca",
  "ccsa.ca",
  "health.gov.au",
  "healthdirect.gov.au",
  "nhmrc.gov.au",
  "icmr.gov.in",
  "mohfw.gov.in",
  "heart.org",
  "ahajournals.org",
  "acc.org",
  "jacc.org",
  "escardio.org",
  "diabetes.org",
  "diabetesjournals.org",
  "acog.org",
  "aad.org",
  "aasm.org",
  "sleepfoundation.org",
  "thensf.org",
  "endocrine.org",
  "acsm.org",
  "aafp.org",
  "aap.org",
  "healthychildren.org",
  "acponline.org",
  "acpjournals.org",
  "gastro.org",
  "gi.org",
  "rheumatology.org",
  "auanet.org",
  "menopause.org",
  "thyroid.org",
  "psychiatry.org",
  "apa.org",
  "cancer.org",
  "redcross.org",
  "ifrc.org",
  "ilae.org",
  "ichd-3.org",
  "idf.org",
  "worldobesity.org",
  "alz.org",
  "alzint.org",
  "cochrane.org",
  "cochranelibrary.com",
  "nejm.org",
  "thelancet.com",
  "bmj.com",
  "jamanetwork.com",
  "nature.com",
  "science.org",
  "cell.com",
  "sciencedirect.com",
  "springer.com",
  "biomedcentral.com",
  "wiley.com",
  "oup.com",
  "tandfonline.com",
  "sagepub.com",
  "karger.com",
  "frontiersin.org",
  "plos.org",
  "mdpi.com",
  "lww.com",
  "humankinetics.com",
  "jospt.org",
  "aacrjournals.org",
  "ascopubs.org",
  "atsjournals.org",
  "ersjournals.com",
  "doi.org",
  "mayoclinic.org",
  "clevelandclinic.org",
  "harvard.edu",
  "hopkinsmedicine.org",
  "stanford.edu",
  "monashfodmap.com",
  "monash.edu",
  "iarc.who.int",
  "wcrf.org",
  "efsa.europa.eu",
  "ods.od.nih.gov",
  "nccih.nih.gov",
  "samhsa.gov",
  "hhs.gov",
  "surgeongeneral.gov",
  "ftc.gov",
  "nasa.gov",
  "olympics.com",
  "bjsm.bmj.com",
  "iofbonehealth.org",
  "bonehealthandosteoporosis.org",
  "theros.org.uk",
  "skincancer.org",
  "ada.org",
  "fdiworlddental.org",
  "kidney.org",
  "kdigo.org",
  "lung.org",
  "ginasthma.org",
  "goldcopd.org",
  "stroke.org",
  "stroke.org.uk",
  "bhf.org.uk",
  "diabetes.org.uk",
  "mind.org.uk",
  "nimh.nih.gov",
  "findahelpline.com",
  "iasp.info",
  "issn.net",
  "sportsnutritionsociety.org",
  "eatright.org",
  "bda.uk.com",
  "eshre.eu",
  "asrm.org",
  "figo.org",
  "rcog.org.uk",
  "rcpsych.ac.uk",
  "racgp.org.au",
  "uptodate.com",
  "msdmanuals.com",
  "merckmanuals.com",
  "nationalacademies.org",
  "nap.edu",
  "census.gov",
  "ourworldindata.org",
  "healthdata.org",
  "unicef.org",
  "un.org",
  "worldbank.org",
  "oecd.org",
  "paho.org",
  "ecdc.europa.eu",
  "vaccines.gov",
  "immunize.org",
  "aaaai.org",
  "acaai.org",
  "eaaci.org",
  "aaos.org",
  "apta.org",
  "csp.org.uk",
  "versusarthritis.org",
  "arthritis.org",
  "niams.nih.gov",
  "aao.org",
  "aoa.org",
  "entnet.org",
  "americanheadachesociety.org",
  "americanmigrainefoundation.org",
  "epilepsy.com",
  "parkinson.org",
  "nationalmssociety.org",
  "concussioninsportgroup.com",
  "chadd.org",
  "nationaleatingdisorders.org",
  "beateatingdisorders.org.uk",
  "adaa.org",
  "ptsd.va.gov",
  "va.gov",
  "iocdf.org",
  "pcosaa.org",
  "endometriosis.org",
  "breastcancer.org",
  "pcf.org",
  "urologyhealth.org",
  "celiac.org",
  "crohnscolitisfoundation.org",
  "liverfoundation.org",
  "aasld.org",
  "easl.eu",
  "theromefoundation.org",
  "worldgastroenterology.org",
  "isappscience.org",
  "eufic.org",
  "fao.org",
  "food.gov.uk",
  "foodstandards.gov.au",
  "nutrition.org",
  "nutrition.org.uk",
  "hsph.harvard.edu",
  "lpi.oregonstate.edu",
  "oregonstate.edu",
  "examine.com",
  "tuberculosis.org",
  "stoptb.org",
  "malariaconsortium.org",
  "unaids.org",
  "hiv.gov",
  "aidsinfo.nih.gov",
  "psoriasis.org",
  "nationaleczema.org",
  "rosacea.org",
  "britishskinfoundation.org.uk",
  "bad.org.uk",
  "dermnetnz.org",
  "sleepeducation.org",
  "sleepapnea.org",
  "worldsleepsociety.org",
  "thoracic.org",
  "brit-thoracic.org.uk",
  "resus.org.uk",
  "cpr.heart.org",
  "ilcor.org",
  "erc.edu",
  "sja.org.uk",
  "stjohn.org.au",
  "poison.org",
  "wada-ama.org",
  "ncaa.org",
  "researchgate.net",
  "europepmc.org",
  "medrxiv.org",
  "elifesciences.org",
  "pnas.org",
  "royalsocietypublishing.org",
  "cambridge.org",
  "annualreviews.org",
  "liebertpub.com",
  "thieme-connect.com",
  "jci.org",
  "physiology.org",
  "ahajournals.org",
  "onlinelibrary.wiley.com",
  "academic.oup.com",
  "link.springer.com",
  "journals.sagepub.com",
  "journals.lww.com",
  "journals.plos.org",
  "ncbi.nlm.nih.gov",
  "pubmed.ncbi.nlm.nih.gov",
  "pmc.ncbi.nlm.nih.gov",
];

function hostTrusted(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return TRUSTED_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

function readJson(file: string, issues: Issue[], rel: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    issues.push({ level: "error", file: rel, message: `Invalid JSON: ${(err as Error).message}` });
    return undefined;
  }
}

function listFiles(dir: string, ext: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, ext));
    else if (entry.name.endsWith(ext) && !entry.name.startsWith("_")) out.push(full);
  }
  return out.sort();
}

function zodIssues(error: z.ZodError, file: string, prefix = ""): Issue[] {
  return error.issues.map((i) => ({
    level: "error" as const,
    file,
    message: `${prefix}${i.path.length ? i.path.join(".") + ": " : ""}${i.message}`,
  }));
}

const BANNED = [/\blorem ipsum\b/i, /\bTODO\b/, /\[citation needed\]/i, /\bas an ai\b/i, /\bTKTK\b/];
const DISCOURAGED = [
  /\bsuperfoods?\b/i,
  /\bmiracle\b/i,
  /\bdetox(ify|ification|ing)?\b/i,
  /\btoxins\b/i,
  /\bgame[- ]changer\b/i,
  /\bin today's fast-paced world\b/i,
  /\bunlock(ing)? the (secret|power)\b/i,
];

type LinkTargets = {
  articles: Set<string>;
  conditions: Set<string>;
  tools: Set<string>;
  categories: Set<string>;
  systems: Set<string>;
};

function checkMarkdownBody(
  body: string,
  file: string,
  sourceCount: number,
  targets: LinkTargets,
  issues: Issue[],
  opts: { requireCitations: number },
) {
  const push = (level: Issue["level"], message: string) => issues.push({ level, file, message });

  if (/^#\s+\S/m.test(body)) push("error", "Body must not contain an H1 (# Heading). Start sections at ##.");
  if (/<\/?(div|span|p|br|img|script|style|iframe|table|a|sup|sub|h[1-6])\b/i.test(body)) {
    push("error", "Raw HTML is not allowed in the body. Use Markdown only.");
  }
  if (/!\[[^\]]*\]\(/.test(body)) push("error", "Images are not allowed in the body.");
  for (const re of BANNED) if (re.test(body)) push("error", `Body contains placeholder text matching ${re}`);
  for (const re of DISCOURAGED) {
    const m = body.match(re);
    if (m) push("warn", `Discouraged phrase "${m[0]}" (fine only when debunking it).`);
  }
  if (/[—]/.test(body) && (body.match(/—/g) ?? []).length > 12) {
    push("warn", "Heavy em-dash use; prefer commas, colons or full stops.");
  }

  // Callouts
  for (const m of body.matchAll(/^>\s*\[!([A-Za-z]+)\]/gm)) {
    if (!(CALLOUT_TYPES as readonly string[]).includes(m[1])) {
      push("error", `Unknown callout type [!${m[1]}]. Allowed: ${CALLOUT_TYPES.join(", ")}.`);
    }
  }
  for (const m of body.matchAll(/^>\s*\[!STAT\](.*)$/gm)) {
    const figure = m[1].trim();
    if (!figure) push("error", "[!STAT] needs the figure on the same line, e.g. `> [!STAT] 150 min`.");
    else if (figure.length > 14) push("error", `[!STAT] figure "${figure}" is too long (max 14 characters).`);
  }

  // Citations
  const cited = new Set<number>();
  for (const m of body.matchAll(/\[\^(\d+)\]/g)) {
    const n = Number(m[1]);
    cited.add(n);
    if (n < 1 || n > sourceCount) push("error", `Citation [^${n}] has no matching source (there are ${sourceCount}).`);
  }
  if (/^\[\^\d+\]:/m.test(body)) {
    push("error", "Do not write footnote definitions in the body. Sources belong in frontmatter only.");
  }
  if (cited.size < opts.requireCitations) {
    push("error", `Only ${cited.size} distinct citations in the body; need at least ${opts.requireCitations}.`);
  }
  for (let n = 1; n <= sourceCount; n++) {
    if (!cited.has(n)) push("warn", `Source ${n} is never cited in the body with [^${n}].`);
  }

  // Links
  for (const m of body.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const href = m[1];
    if (href.startsWith("#")) continue;
    if (/^https?:\/\//.test(href)) {
      push("warn", `External link in body (${href}). Prefer citing it as a source.`);
      continue;
    }
    if (!href.startsWith("/")) {
      push("error", `Link "${href}" must be an absolute site path such as /articles/slug.`);
      continue;
    }
    const clean = href.split("#")[0].replace(/\/$/, "") || "/";
    const seg = clean.split("/").filter(Boolean);
    let ok = STATIC_PATHS.has(clean);
    if (!ok && seg.length === 2) {
      if (seg[0] === "articles") ok = targets.articles.has(seg[1]);
      else if (seg[0] === "conditions") ok = targets.conditions.has(seg[1]);
      else if (seg[0] === "tools") ok = targets.tools.has(seg[1]);
      else if (seg[0] === "topics") ok = targets.categories.has(seg[1]);
      else if (seg[0] === "body") ok = targets.systems.has(seg[1]);
    }
    if (!ok) push("error", `Internal link ${href} does not match any planned or existing page.`);
  }
}

function checkSources(sources: { url: string; publisher: string }[], file: string, issues: Issue[]) {
  const seen = new Set<string>();
  sources.forEach((s, i) => {
    if (seen.has(s.url)) issues.push({ level: "error", file, message: `Source ${i + 1} duplicates an earlier URL.` });
    seen.add(s.url);
    if (!hostTrusted(s.url)) {
      issues.push({
        level: "warn",
        file,
        message: `Source ${i + 1} host is not on the trusted-publisher list: ${s.url}`,
      });
    }
    if (/wikipedia\.org|healthline\.com|webmd\.com|verywell|medicalnewstoday|quora\.com|reddit\.com/i.test(s.url)) {
      issues.push({
        level: "error",
        file,
        message: `Source ${i + 1} is not a primary or authoritative source: ${s.url}`,
      });
    }
  });
}

export function loadContent(root = path.join(process.cwd(), "content")): LoadedContent {
  const issues: Issue[] = [];
  const rel = (f: string) => path.relative(path.dirname(root), f);

  // ---- Reference data
  const categoriesRaw = readJson(path.join(root, "categories.json"), issues, "content/categories.json");
  const categories = z.array(categorySchema).safeParse(categoriesRaw);
  if (!categories.success) issues.push(...zodIssues(categories.error, "content/categories.json"));
  const categoryList = categories.success ? categories.data : [];

  const systemsRaw = readJson(path.join(root, "body-systems.json"), issues, "content/body-systems.json");
  const systems = z.array(bodySystemSchema).safeParse(systemsRaw);
  if (!systems.success) issues.push(...zodIssues(systems.error, "content/body-systems.json"));
  const systemList = systems.success ? systems.data : [];

  const stickersRaw = readJson(path.join(root, "stickers.json"), issues, "content/stickers.json") as
    | { ids?: string[] }
    | undefined;
  const stickers = stickersRaw?.ids ?? [];
  const stickerSet = new Set(stickers);

  const plan = (readJson(path.join(root, "plan.json"), issues, "content/plan.json") as Plan | undefined) ?? {
    tools: [],
    articles: [],
    conditions: [],
  };

  const sitePath = path.join(root, "site.json");
  const site = fs.existsSync(sitePath)
    ? ((readJson(sitePath, issues, "content/site.json") as Record<string, unknown>) ?? {})
    : {};

  const categorySet = new Set(categoryList.map((c) => c.slug));
  const systemSet = new Set(systemList.map((s) => s.slug));
  for (const c of categoryList) {
    if (!stickerSet.has(c.sticker)) {
      issues.push({ level: "error", file: "content/categories.json", message: `Unknown sticker ${c.sticker}` });
    }
  }
  for (const s of systemList) {
    if (!stickerSet.has(s.sticker)) {
      issues.push({ level: "error", file: "content/body-systems.json", message: `Unknown sticker ${s.sticker}` });
    }
  }

  // ---- Link targets: planned slugs plus whatever exists on disk
  const articleFiles = listFiles(path.join(root, "articles"), ".md");
  const conditionFiles = listFiles(path.join(root, "conditions"), ".md");
  const targets: LinkTargets = {
    articles: new Set([...plan.articles.map((a) => a.slug), ...articleFiles.map((f) => path.basename(f, ".md"))]),
    conditions: new Set([
      ...plan.conditions.map((c) => c.slug),
      ...conditionFiles.map((f) => path.basename(f, ".md")),
    ]),
    tools: new Set(plan.tools),
    categories: categorySet,
    systems: systemSet,
  };
  const planOrder = new Map(plan.articles.map((a, i) => [a.slug, i]));

  // ---- Articles
  const articles: LoadedArticle[] = [];
  const seenArticle = new Map<string, string>();
  for (const file of articleFiles) {
    const r = rel(file);
    const slug = path.basename(file, ".md");
    const folder = path.basename(path.dirname(file));
    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(fs.readFileSync(file, "utf8"));
    } catch (err) {
      issues.push({ level: "error", file: r, message: `Frontmatter could not be parsed: ${(err as Error).message}` });
      continue;
    }
    const fm = articleFrontmatterSchema.safeParse(parsed.data);
    if (!fm.success) {
      issues.push(...zodIssues(fm.error, r));
      continue;
    }
    const data = fm.data;
    const body = parsed.content.trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      issues.push({ level: "error", file: r, message: "File name must be a lowercase-hyphenated slug." });
    }
    if (seenArticle.has(slug)) {
      issues.push({ level: "error", file: r, message: `Duplicate article slug (also ${seenArticle.get(slug)}).` });
    }
    seenArticle.set(slug, r);
    if (!categorySet.has(data.category)) {
      issues.push({ level: "error", file: r, message: `Unknown category "${data.category}".` });
    }
    if (folder !== data.category) {
      issues.push({ level: "error", file: r, message: `File is in folder "${folder}" but category is "${data.category}".` });
    }
    if (!stickerSet.has(data.sticker)) {
      issues.push({ level: "error", file: r, message: `Unknown sticker "${data.sticker}".` });
    }
    for (const t of data.tags) {
      if (t !== t.toLowerCase()) issues.push({ level: "error", file: r, message: `Tag "${t}" must be lowercase.` });
    }
    for (const rs of data.related ?? []) {
      if (!targets.articles.has(rs)) {
        issues.push({ level: "error", file: r, message: `related: unknown article slug "${rs}".` });
      }
    }
    const words = countWords(body);
    if (words < 800) issues.push({ level: "error", file: r, message: `Body is ${words} words; minimum is 800.` });
    if (words > 2000) issues.push({ level: "error", file: r, message: `Body is ${words} words; maximum is 2000.` });
    const h2 = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
    if (h2.length < 3) issues.push({ level: "error", file: r, message: "Body needs at least three ## sections." });
    if (h2.length && !/^the bottom line$/i.test(h2[h2.length - 1])) {
      issues.push({ level: "error", file: r, message: 'The last ## section must be "The bottom line".' });
    }
    if (/^##\s/.test(body)) {
      issues.push({ level: "error", file: r, message: "Open with one or two intro paragraphs before the first ## heading." });
    }
    if (!/^>\s*\[!(TIP|NOTE|WARNING|DOCTOR|STAT)\]/m.test(body)) {
      issues.push({ level: "warn", file: r, message: "No callouts used. Most pieces benefit from at least one." });
    }
    checkSources(data.sources, r, issues);
    checkMarkdownBody(body, r, data.sources.length, targets, issues, { requireCitations: 4 });
    articles.push({
      ...data,
      slug,
      body,
      words,
      readingMinutes: readingMinutes(body),
      order: planOrder.get(slug) ?? 1000 + articles.length,
      file: r,
    });
  }

  // ---- Conditions
  const conditions: LoadedCondition[] = [];
  for (const file of conditionFiles) {
    const r = rel(file);
    const slug = path.basename(file, ".md");
    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(fs.readFileSync(file, "utf8"));
    } catch (err) {
      issues.push({ level: "error", file: r, message: `Frontmatter could not be parsed: ${(err as Error).message}` });
      continue;
    }
    const fm = conditionFrontmatterSchema.safeParse(parsed.data);
    if (!fm.success) {
      issues.push(...zodIssues(fm.error, r));
      continue;
    }
    const data = fm.data;
    const body = parsed.content.trim();
    if (!systemSet.has(data.system)) issues.push({ level: "error", file: r, message: `Unknown system "${data.system}".` });
    if (!categorySet.has(data.category)) {
      issues.push({ level: "error", file: r, message: `Unknown category "${data.category}".` });
    }
    const h2 = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
    const expected = CONDITION_SECTIONS as readonly string[];
    if (h2.length !== expected.length || h2.some((h, i) => h !== expected[i])) {
      issues.push({
        level: "error",
        file: r,
        message: `Sections must be exactly, in order: ${expected.join(" / ")}. Found: ${h2.join(" / ") || "none"}.`,
      });
    }
    const words = countWords(body);
    if (words < 320) issues.push({ level: "error", file: r, message: `Body is ${words} words; minimum is 320.` });
    if (words > 750) issues.push({ level: "error", file: r, message: `Body is ${words} words; maximum is 750.` });
    checkSources(data.sources, r, issues);
    checkMarkdownBody(body, r, data.sources.length, targets, issues, { requireCitations: 2 });
    conditions.push({ ...data, slug, body, words, file: r });
  }

  // ---- JSON collections
  function loadJsonCollection<T>(
    dir: string,
    schema: z.ZodType<T>,
    nameOf: (item: T) => string,
    extra?: (item: T, file: string, index: number) => void,
  ): (T & { slug: string })[] {
    const out: (T & { slug: string })[] = [];
    const seen = new Map<string, string>();
    for (const file of listFiles(path.join(root, dir), ".json")) {
      const r = rel(file);
      const raw = readJson(file, issues, r);
      if (raw === undefined) continue;
      if (!Array.isArray(raw)) {
        issues.push({ level: "error", file: r, message: "File must contain a JSON array." });
        continue;
      }
      raw.forEach((item, index) => {
        const parsed = schema.safeParse(item);
        if (!parsed.success) {
          issues.push(...zodIssues(parsed.error, r, `[${index}] `));
          return;
        }
        const slug = slugify(nameOf(parsed.data));
        if (seen.has(slug)) {
          issues.push({ level: "error", file: r, message: `[${index}] duplicate entry "${slug}" (also in ${seen.get(slug)}).` });
          return;
        }
        seen.set(slug, r);
        extra?.(parsed.data, r, index);
        out.push({ ...parsed.data, slug });
      });
    }
    return out;
  }

  const glossary = loadJsonCollection(
    "glossary",
    glossaryTermSchema,
    (t) => t.term,
    (t, file, i) => {
      if (!categorySet.has(t.category)) {
        issues.push({ level: "error", file, message: `[${i}] unknown category "${t.category}".` });
      }
    },
  );
  const glossarySlugs = new Set(glossary.map((g) => g.slug));
  for (const g of glossary) {
    for (const s of g.seeAlso ?? []) {
      if (!glossarySlugs.has(slugify(s))) {
        issues.push({ level: "warn", file: "content/glossary", message: `"${g.term}" seeAlso "${s}" is not a glossary term.` });
      }
    }
  }

  const myths = loadJsonCollection(
    "myths",
    mythSchema,
    (m) => m.myth,
    (m, file, i) => {
      if (!categorySet.has(m.category)) issues.push({ level: "error", file, message: `[${i}] unknown category "${m.category}".` });
      if (!stickerSet.has(m.sticker)) issues.push({ level: "error", file, message: `[${i}] unknown sticker "${m.sticker}".` });
      checkSources(m.sources, `${file} [${i}]`, issues);
    },
  );

  const foods = loadJsonCollection(
    "foods",
    foodSchema,
    (f) => f.name,
    (f, file, i) => {
      const p = f.per100g;
      // Alcohol carries 7 kcal per gram and is listed among the micros for drinks.
      const alcohol = f.micros?.find((m) => m.name.toLowerCase() === "alcohol" && m.unit === "g")?.amount ?? 0;
      const macroKcal = p.protein * 4 + p.carbs * 4 + p.fat * 9 + alcohol * 7;
      // Fibre and sugar alcohols make this approximate; flag only clear mismatches.
      if (p.kcal > 20 && Math.abs(macroKcal - p.kcal) / p.kcal > 0.25 && Math.abs(macroKcal - p.kcal) > 25) {
        issues.push({
          level: "warn",
          file,
          message: `[${i}] ${f.name}: macros imply ~${Math.round(macroKcal)} kcal but kcal is ${p.kcal}. Check the numbers.`,
        });
      }
      if (p.fiber + p.sugars > p.carbs + 0.6) {
        issues.push({ level: "error", file, message: `[${i}] ${f.name}: fiber + sugars exceed total carbs.` });
      }
      if (p.satFat > p.fat + 0.1) {
        issues.push({ level: "error", file, message: `[${i}] ${f.name}: saturated fat exceeds total fat.` });
      }
      if (p.protein + p.carbs + p.fat > 101) {
        issues.push({ level: "error", file, message: `[${i}] ${f.name}: macros add up to more than 100 g per 100 g.` });
      }
    },
  );

  const exercises = loadJsonCollection("exercises", exerciseSchema, (e) => e.name);

  // ---- Newsletter and pages
  const newsletter: LoadedNewsletter[] = [];
  for (const file of listFiles(path.join(root, "newsletter"), ".md")) {
    const r = rel(file);
    const parsed = matter(fs.readFileSync(file, "utf8"));
    const fm = newsletterFrontmatterSchema.safeParse(parsed.data);
    if (!fm.success) {
      issues.push(...zodIssues(fm.error, r));
      continue;
    }
    if (fm.data.sticker && !stickerSet.has(fm.data.sticker)) {
      issues.push({ level: "error", file: r, message: `Unknown sticker "${fm.data.sticker}".` });
    }
    const body = parsed.content.trim();
    checkMarkdownBody(body, r, 0, targets, issues, { requireCitations: 0 });
    newsletter.push({ ...fm.data, slug: path.basename(file, ".md").replace(/^\d+-/, ""), body, file: r });
  }

  const pages: LoadedPage[] = [];
  for (const file of listFiles(path.join(root, "pages"), ".md")) {
    const r = rel(file);
    const parsed = matter(fs.readFileSync(file, "utf8"));
    const fm = pageFrontmatterSchema.safeParse(parsed.data);
    if (!fm.success) {
      issues.push(...zodIssues(fm.error, r));
      continue;
    }
    pages.push({ ...fm.data, slug: path.basename(file, ".md"), body: parsed.content.trim(), file: r });
  }

  // ---- Forum seeds
  let forumBoards: ForumBoardSeed[] = [];
  let forumThreads: ForumThreadSeed[] = [];
  const boardsPath = path.join(root, "forum", "boards.json");
  if (fs.existsSync(boardsPath)) {
    const parsed = z.array(forumBoardSchema).safeParse(readJson(boardsPath, issues, "content/forum/boards.json"));
    if (parsed.success) forumBoards = parsed.data;
    else issues.push(...zodIssues(parsed.error, "content/forum/boards.json"));
  }
  const threadsPath = path.join(root, "forum", "threads.json");
  if (fs.existsSync(threadsPath)) {
    const parsed = z.array(forumThreadSchema).safeParse(readJson(threadsPath, issues, "content/forum/threads.json"));
    if (parsed.success) forumThreads = parsed.data;
    else issues.push(...zodIssues(parsed.error, "content/forum/threads.json"));
    const boardSlugs = new Set(forumBoards.map((b) => b.slug));
    for (const t of forumThreads) {
      if (!boardSlugs.has(t.board)) {
        issues.push({ level: "error", file: "content/forum/threads.json", message: `Unknown board "${t.board}".` });
      }
    }
  }

  return {
    root,
    categories: categoryList,
    bodySystems: systemList,
    stickers,
    plan,
    site,
    articles,
    conditions,
    glossary,
    myths,
    foods,
    exercises,
    newsletter,
    pages,
    forumBoards,
    forumThreads,
    issues,
  };
}
