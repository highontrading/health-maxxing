/**
 * Content schemas shared by the validator (scripts/validate-content.ts) and the
 * database sync (scripts/sync-content.ts). Plain TypeScript: no Next.js or
 * server-only imports, so it can run under tsx.
 */
import { z } from "zod";

export const ARTICLE_KINDS = ["guide", "explainer", "how-to", "list", "deep-dive"] as const;
export const CALLOUT_TYPES = ["TIP", "NOTE", "WARNING", "DOCTOR", "STAT"] as const;
/**
 * verified: every figure and source URL was confirmed against the source in a live search.
 * pending:  written from established knowledge; needs an independent source check.
 */
export const FACT_CHECK_STATES = ["verified", "pending"] as const;
export const MYTH_VERDICTS = ["false", "misleading", "partly-true", "true"] as const;
export const FOOD_GROUPS = [
  "vegetables",
  "fruits",
  "grains",
  "legumes",
  "nuts-seeds",
  "meat-poultry",
  "fish-seafood",
  "dairy-eggs",
  "plant-proteins",
  "oils-fats",
  "snacks-sweets",
  "drinks",
] as const;
export const EXERCISE_TYPES = ["strength", "cardio", "core", "mobility", "balance"] as const;
export const EXERCISE_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const EXERCISE_EQUIPMENT = [
  "bodyweight",
  "dumbbell",
  "kettlebell",
  "barbell",
  "band",
  "bench",
  "pull-up bar",
  "cable",
  "machine",
  "medicine ball",
  "jump rope",
  "box",
  "mat",
  "foam roller",
  "cardio machine",
] as const;
export const COLOR_KEYS = [
  "lime",
  "orange",
  "indigo",
  "lilac",
  "pink",
  "yellow",
  "teal",
  "rose",
  "sky",
  "peach",
  "tan",
  "green",
  "mint",
  "plum",
  "sand",
  "blue",
] as const;

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const slugSchema = z.string().regex(slugRe, "must be lowercase words joined by hyphens");

const httpsUrl = z
  .string()
  .regex(/^https:\/\/[^\s]+$/, "must be a full https:// URL")
  .refine((u) => {
    try {
      new URL(u);
      return true;
    } catch {
      return false;
    }
  }, "must be a valid URL");

export const sourceSchema = z.object({
  title: z.string().min(5).max(240),
  publisher: z.string().min(2).max(120),
  url: httpsUrl,
  year: z.number().int().min(1950).max(2100).optional(),
});
export type Source = z.infer<typeof sourceSchema>;

export const faqSchema = z.object({
  q: z.string().min(8).max(160),
  a: z.string().min(20).max(700),
});
export type Faq = z.infer<typeof faqSchema>;

export const articleFrontmatterSchema = z.object({
  title: z.string().min(12).max(90),
  dek: z.string().min(30).max(220),
  summary: z.string().min(40).max(170),
  category: slugSchema,
  tags: z.array(z.string().min(2).max(32)).min(3).max(7),
  sticker: z.string(),
  kind: z.enum(ARTICLE_KINDS),
  featured: z.boolean().optional(),
  takeaways: z.array(z.string().min(15).max(220)).min(3).max(5),
  faqs: z.array(faqSchema).min(2).max(5),
  sources: z.array(sourceSchema).min(4).max(12),
  related: z.array(slugSchema).max(4).optional(),
  factCheck: z.enum(FACT_CHECK_STATES).optional(),
});
export type ArticleFrontmatter = z.infer<typeof articleFrontmatterSchema>;

export const conditionFrontmatterSchema = z.object({
  name: z.string().min(3).max(90),
  aka: z.array(z.string().min(2).max(60)).max(6).optional(),
  system: slugSchema,
  category: slugSchema,
  summary: z.string().min(40).max(220),
  symptoms: z.array(z.string().min(3).max(90)).min(3).max(10),
  urgent: z.array(z.string().min(5).max(140)).max(6).optional(),
  sources: z.array(sourceSchema).min(3).max(8),
  factCheck: z.enum(FACT_CHECK_STATES).optional(),
});
export type ConditionFrontmatter = z.infer<typeof conditionFrontmatterSchema>;

export const CONDITION_SECTIONS = [
  "What it is",
  "Symptoms",
  "Causes and risk factors",
  "Diagnosis",
  "Treatment",
  "Prevention and self-care",
  "When to see a doctor",
] as const;

export const glossaryTermSchema = z.object({
  term: z.string().min(2).max(60),
  definition: z.string().min(30).max(420),
  category: slugSchema,
  seeAlso: z.array(z.string().min(2).max(60)).max(4).optional(),
});
export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;

export const mythSchema = z.object({
  myth: z.string().min(10).max(140),
  verdict: z.enum(MYTH_VERDICTS),
  answer: z.string().min(15).max(200),
  explanation: z.string().min(80).max(700),
  category: slugSchema,
  sticker: z.string(),
  sources: z.array(sourceSchema).min(1).max(3),
});
export type Myth = z.infer<typeof mythSchema>;

const nutrient = z.number().min(0).max(1000);
export const foodSchema = z.object({
  name: z.string().min(2).max(70),
  group: z.enum(FOOD_GROUPS),
  fdcId: z.number().int().positive().optional(),
  serving: z.object({ label: z.string().min(2).max(60), grams: z.number().positive().max(1000) }),
  per100g: z.object({
    kcal: z.number().min(0).max(902),
    protein: nutrient,
    carbs: nutrient,
    fiber: nutrient,
    sugars: nutrient,
    fat: nutrient,
    satFat: nutrient,
    sodiumMg: z.number().min(0).max(40000),
  }),
  micros: z
    .array(
      z.object({
        name: z.string().min(2).max(40),
        amount: z.number().min(0),
        unit: z.enum(["mg", "mcg", "g", "IU"]),
      }),
    )
    .max(5)
    .optional(),
  note: z.string().min(15).max(200),
});
export type Food = z.infer<typeof foodSchema>;

export const exerciseSchema = z.object({
  name: z.string().min(3).max(60),
  type: z.enum(EXERCISE_TYPES),
  pattern: z.string().min(3).max(30),
  muscles: z.object({
    primary: z.array(z.string().min(3).max(30)).min(1).max(4),
    secondary: z.array(z.string().min(3).max(30)).max(5),
  }),
  equipment: z.array(z.enum(EXERCISE_EQUIPMENT)).min(1).max(4),
  level: z.enum(EXERCISE_LEVELS),
  summary: z.string().min(30).max(220),
  steps: z.array(z.string().min(15).max(260)).min(3).max(7),
  cues: z.array(z.string().min(5).max(120)).min(2).max(5),
  mistakes: z.array(z.string().min(5).max(160)).min(2).max(5),
  easier: z.string().min(5).max(160).optional(),
  harder: z.string().min(5).max(160).optional(),
});
export type Exercise = z.infer<typeof exerciseSchema>;

export const categorySchema = z.object({
  slug: slugSchema,
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  color: z.enum(COLOR_KEYS),
  sticker: z.string(),
  order: z.number().int(),
});
export type Category = z.infer<typeof categorySchema>;

export const bodySystemSchema = z.object({
  slug: slugSchema,
  name: z.string(),
  description: z.string(),
  sticker: z.string(),
  color: z.enum(COLOR_KEYS),
  organs: z.array(z.string()),
  categories: z.array(slugSchema),
  order: z.number().int(),
});
export type BodySystem = z.infer<typeof bodySystemSchema>;

export const newsletterFrontmatterSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(5).max(100),
  preheader: z.string().min(20).max(180),
  sticker: z.string().optional(),
});
export type NewsletterFrontmatter = z.infer<typeof newsletterFrontmatterSchema>;

export const pageFrontmatterSchema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().min(20).max(200),
});
export type PageFrontmatter = z.infer<typeof pageFrontmatterSchema>;

export const forumBoardSchema = z.object({
  slug: slugSchema,
  name: z.string().min(3).max(50),
  description: z.string().min(10).max(200),
  sticker: z.string(),
  color: z.enum(COLOR_KEYS),
  order: z.number().int(),
});
export type ForumBoardSeed = z.infer<typeof forumBoardSchema>;

export const forumThreadSchema = z.object({
  board: slugSchema,
  title: z.string().min(8).max(140),
  body: z.string().min(40).max(6000),
  pinned: z.boolean().optional(),
  locked: z.boolean().optional(),
});
export type ForumThreadSeed = z.infer<typeof forumThreadSchema>;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Rough word count of a Markdown body (ignores syntax and citation markers). */
export function countWords(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[\^\d+\]/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^>\s*\[!\w+\].*$/gm, " ")
    .replace(/[#>*_`|~-]/g, " ");
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%/-]*/gu);
  return words ? words.length : 0;
}

export function readingMinutes(markdown: string): number {
  return Math.max(1, Math.round(countWords(markdown) / 220));
}
