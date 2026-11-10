/**
 * What the admin panel can edit, described as data.
 *
 * Each collection maps to one table. The list page, the edit form and the save
 * action are all generated from these definitions, so adding a field here is
 * enough to make it editable. Plain data only: this file is imported by both
 * server code and client form components.
 */
import {
  ARTICLE_KINDS,
  COLOR_KEYS,
  EXERCISE_EQUIPMENT,
  EXERCISE_LEVELS,
  EXERCISE_TYPES,
  FACT_CHECK_STATES,
  FOOD_GROUPS,
  MYTH_VERDICTS,
} from "@/lib/content/schema";

export type FieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "number"
  | "boolean"
  | "select"
  | "sticker"
  | "color"
  | "lines"
  | "csv"
  | "sources"
  | "faqs"
  | "micros"
  | "datetime"
  | "image";

export type Option = { value: string; label: string };

export type FieldDef = {
  /** Column name. */
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: Option[];
  /** Options loaded from the database when the form renders. */
  optionsFrom?: "categories" | "systems";
  rows?: number;
  /** Longest text allowed, or largest number. */
  max?: number;
  min?: number;
  step?: number;
  default?: string | number | boolean;
  /** Shown in the narrow right-hand column of the form. */
  side?: boolean;
  /** Heading the field sits under in the main column. */
  section?: string;
};

export type CollectionGroup = "Publishing" | "Library" | "Structure";

export type CollectionDef = {
  /** URL segment under /admin/c/. */
  key: string;
  table: string;
  /** Cache tags to refresh after a change. */
  tags: string[];
  singular: string;
  plural: string;
  icon: string;
  group: CollectionGroup;
  blurb: string;
  /** Column used as the row's name. */
  title: string;
  /** Public URL, with {slug} filled in. Omit when rows have no page of their own. */
  publicPath?: string;
  /** Column holding a topic slug, when rows can be filtered by topic. */
  topicColumn?: string;
  factCheck?: boolean;
  hasViews?: boolean;
  orderBy: string;
  search: string[];
  fields: FieldDef[];
};

const opts = (values: readonly string[], labels: Record<string, string> = {}): Option[] =>
  values.map((v) => ({ value: v, label: labels[v] ?? v.charAt(0).toUpperCase() + v.slice(1).replace(/-/g, " ") }));

const STATUS: FieldDef = {
  name: "status",
  label: "Visibility",
  type: "select",
  side: true,
  default: "draft",
  options: [
    { value: "published", label: "Published" },
    { value: "draft", label: "Draft (hidden)" },
  ],
};

const FACT_CHECK: FieldDef = {
  name: "fact_check",
  label: "Fact check",
  type: "select",
  side: true,
  default: "pending",
  options: opts(FACT_CHECK_STATES, { verified: "Verified against sources", pending: "Pending a source check" }),
  help: "Mark verified only after every figure and link was checked against its source. Readers see a “Sources verified” badge.",
};

const SLUG: FieldDef = {
  name: "slug",
  label: "URL name",
  type: "text",
  side: true,
  max: 80,
  placeholder: "made-from-the-title",
  help: "Lowercase words joined by hyphens. Leave empty to build it from the title. Changing it changes the page address.",
};

const TOPIC: FieldDef = { name: "category", label: "Topic", type: "select", optionsFrom: "categories", required: true, side: true };
const STICKER: FieldDef = { name: "sticker", label: "Sticker", type: "sticker", side: true, default: "heart" };
const COLOR: FieldDef = { name: "color", label: "Colour", type: "color", side: true, default: "lime", options: opts(COLOR_KEYS) };
const ORDER: FieldDef = {
  name: "sort_order",
  label: "Sort position",
  type: "number",
  side: true,
  default: 100,
  step: 1,
  min: 0,
  max: 100000,
  help: "Lower numbers come first.",
};
const SOURCES: FieldDef = {
  name: "sources",
  label: "Sources",
  type: "sources",
  section: "Evidence",
  help: "Numbered in this order. In the text, cite a source with [^1], [^2] and so on.",
};

export const COLLECTIONS: CollectionDef[] = [
  {
    key: "articles",
    table: "articles",
    tags: ["articles"],
    singular: "article",
    plural: "Articles",
    icon: "book",
    group: "Publishing",
    blurb: "Guides, explainers and deep dives. The heart of the magazine.",
    title: "title",
    publicPath: "/articles/{slug}",
    topicColumn: "category",
    factCheck: true,
    hasViews: true,
    orderBy: "updated_at DESC",
    search: ["title", "slug", "dek", "tags"],
    fields: [
      { name: "title", label: "Headline", type: "text", required: true, max: 120 },
      { name: "dek", label: "Standfirst", type: "textarea", rows: 2, max: 260, help: "One or two sentences under the headline." },
      {
        name: "summary",
        label: "Card summary",
        type: "textarea",
        rows: 2,
        max: 200,
        help: "Shown on cards and in search results. Aim for about 150 characters.",
      },
      {
        name: "body",
        label: "Article",
        type: "markdown",
        required: true,
        rows: 26,
        help: "Start with an introduction, then use ## headings. End with “## The bottom line”.",
      },
      { name: "takeaways", label: "Key takeaways", type: "lines", rows: 5, section: "Extras", help: "One per line. Three to five works best." },
      { name: "faqs", label: "Questions and answers", type: "faqs", section: "Extras" },
      { name: "related", label: "Related articles", type: "csv", section: "Extras", help: "URL names of up to four articles, separated by commas." },
      SOURCES,
      { name: "seo_title", label: "Search title", type: "text", max: 70, section: "Search engines", help: "Optional. Defaults to the headline." },
      {
        name: "seo_description",
        label: "Search description",
        type: "textarea",
        rows: 2,
        max: 170,
        section: "Search engines",
        help: "Optional. Defaults to the card summary.",
      },
      STATUS,
      {
        name: "published_at",
        label: "Publish date",
        type: "datetime",
        side: true,
        help: "A future date schedules the article: it appears on its own within about an hour of that time.",
      },
      FACT_CHECK,
      TOPIC,
      { name: "kind", label: "Format", type: "select", side: true, default: "guide", options: opts(ARTICLE_KINDS, { "how-to": "How-to", "deep-dive": "Deep dive" }) },
      STICKER,
      { name: "featured", label: "Feature on the home page", type: "boolean", side: true },
      { name: "tags", label: "Tags", type: "csv", side: true, help: "Separated by commas." },
      {
        name: "cover_image",
        label: "Cover photo",
        type: "image",
        side: true,
        help: "Optional. Without one, the article gets a sticker-art cover.",
      },
      { name: "cover_alt", label: "Photo description", type: "text", side: true, max: 200, help: "What the photo shows, for screen readers." },
      { name: "cover_credit", label: "Photo credit", type: "text", side: true, max: 120 },
      { name: "author", label: "Byline", type: "text", side: true, max: 80, default: "Health Maxxing Editors" },
      SLUG,
    ],
  },
  {
    key: "conditions",
    table: "conditions",
    tags: ["conditions"],
    singular: "condition",
    plural: "Conditions",
    icon: "activity",
    group: "Publishing",
    blurb: "The A to Z of diseases and health problems, grouped by body system.",
    title: "name",
    publicPath: "/conditions/{slug}",
    topicColumn: "category",
    factCheck: true,
    hasViews: true,
    orderBy: "name COLLATE NOCASE",
    search: ["name", "slug", "aka", "summary"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 90 },
      { name: "aka", label: "Also known as", type: "csv", help: "Other names, separated by commas." },
      { name: "summary", label: "Summary", type: "textarea", rows: 3, required: true, max: 260 },
      { name: "symptoms", label: "Common symptoms", type: "lines", rows: 7, help: "One per line." },
      {
        name: "urgent",
        label: "Get urgent help if",
        type: "lines",
        rows: 5,
        help: "One warning sign per line. Shown in a red box at the top of the page. Leave empty if the condition is not an emergency.",
      },
      {
        name: "body",
        label: "Full page",
        type: "markdown",
        required: true,
        rows: 24,
        help: "Sections in order: What it is, Symptoms, Causes and risk factors, Diagnosis, Treatment, Prevention and self-care, When to see a doctor.",
      },
      SOURCES,
      STATUS,
      FACT_CHECK,
      { name: "system", label: "Body system", type: "select", optionsFrom: "systems", required: true, side: true },
      TOPIC,
      SLUG,
    ],
  },
  {
    key: "newsletter",
    table: "newsletter_issues",
    tags: ["newsletter"],
    singular: "issue",
    plural: "Newsletter",
    icon: "mail",
    group: "Publishing",
    blurb: "Issues of the newsletter. Published issues appear in the public archive.",
    title: "title",
    publicPath: "/newsletter/{slug}",
    orderBy: "number DESC",
    search: ["title", "slug", "preheader"],
    fields: [
      { name: "title", label: "Subject line", type: "text", required: true, max: 100 },
      { name: "preheader", label: "Preview text", type: "textarea", rows: 2, max: 180, help: "The line shown after the subject in an inbox." },
      { name: "body", label: "Issue", type: "markdown", required: true, rows: 24 },
      STATUS,
      { name: "published_at", label: "Publish date", type: "datetime", side: true },
      { name: "number", label: "Issue number", type: "number", side: true, required: true, min: 1, max: 100000, step: 1, default: 1 },
      { ...STICKER, default: "mail" },
      SLUG,
    ],
  },
  {
    key: "pages",
    table: "pages",
    tags: ["pages"],
    singular: "page",
    plural: "Pages",
    icon: "edit",
    group: "Publishing",
    blurb: "About, editorial policy, privacy, terms and other standing pages.",
    title: "title",
    publicPath: "/{slug}",
    orderBy: "title COLLATE NOCASE",
    search: ["title", "slug"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 80 },
      { name: "description", label: "Description", type: "textarea", rows: 2, max: 200, help: "Shown under the title and to search engines." },
      { name: "body", label: "Page", type: "markdown", required: true, rows: 26 },
      STATUS,
      SLUG,
    ],
  },
  {
    key: "myths",
    table: "myths",
    tags: ["myths"],
    singular: "myth",
    plural: "Myths",
    icon: "close",
    group: "Library",
    blurb: "Common health claims with a verdict and the reasoning.",
    title: "myth",
    topicColumn: "category",
    orderBy: "sort_order, id",
    search: ["myth", "answer", "explanation"],
    fields: [
      { name: "myth", label: "The claim", type: "text", required: true, max: 140, placeholder: "You need eight glasses of water a day" },
      { name: "answer", label: "Short answer", type: "textarea", rows: 2, required: true, max: 220 },
      { name: "explanation", label: "Explanation", type: "textarea", rows: 6, required: true, max: 800 },
      { ...SOURCES, section: undefined },
      STATUS,
      {
        name: "verdict",
        label: "Verdict",
        type: "select",
        side: true,
        default: "false",
        options: opts(MYTH_VERDICTS, { "partly-true": "Partly true" }),
      },
      TOPIC,
      { ...STICKER, default: "cross" },
      { ...ORDER, default: 1000 },
      SLUG,
    ],
  },
  {
    key: "glossary",
    table: "glossary",
    tags: ["glossary"],
    singular: "term",
    plural: "Glossary",
    icon: "quote",
    group: "Library",
    blurb: "Plain-language definitions of health and medical terms.",
    title: "term",
    topicColumn: "category",
    orderBy: "term COLLATE NOCASE",
    search: ["term", "definition"],
    fields: [
      { name: "term", label: "Term", type: "text", required: true, max: 60 },
      { name: "definition", label: "Definition", type: "textarea", rows: 5, required: true, max: 500 },
      { name: "see_also", label: "See also", type: "csv", help: "Related terms, separated by commas." },
      STATUS,
      TOPIC,
      SLUG,
    ],
  },
  {
    key: "foods",
    table: "foods",
    tags: ["foods"],
    singular: "food",
    plural: "Foods",
    icon: "table",
    group: "Library",
    blurb: "The nutrition table. All values are per 100 grams.",
    title: "name",
    publicPath: "/foods/{slug}",
    orderBy: "name COLLATE NOCASE",
    search: ["name", "slug", "food_group"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 70 },
      { name: "note", label: "Why it matters", type: "textarea", rows: 2, max: 240 },
      { name: "kcal", label: "Calories (kcal)", type: "number", section: "Per 100 g", min: 0, max: 902, step: 0.1, default: 0 },
      { name: "protein", label: "Protein (g)", type: "number", section: "Per 100 g", min: 0, max: 100, step: 0.1, default: 0 },
      { name: "carbs", label: "Carbohydrate (g)", type: "number", section: "Per 100 g", min: 0, max: 100, step: 0.1, default: 0 },
      { name: "fiber", label: "Fiber (g)", type: "number", section: "Per 100 g", min: 0, max: 100, step: 0.1, default: 0 },
      { name: "sugars", label: "Sugars (g)", type: "number", section: "Per 100 g", min: 0, max: 100, step: 0.1, default: 0 },
      { name: "fat", label: "Fat (g)", type: "number", section: "Per 100 g", min: 0, max: 100, step: 0.1, default: 0 },
      { name: "sat_fat", label: "Saturated fat (g)", type: "number", section: "Per 100 g", min: 0, max: 100, step: 0.1, default: 0 },
      { name: "sodium_mg", label: "Sodium (mg)", type: "number", section: "Per 100 g", min: 0, max: 40000, step: 1, default: 0 },
      { name: "micros", label: "Notable vitamins and minerals", type: "micros", section: "Per 100 g" },
      STATUS,
      { name: "food_group", label: "Group", type: "select", side: true, default: "vegetables", options: opts(FOOD_GROUPS, { "nuts-seeds": "Nuts and seeds", "meat-poultry": "Meat and poultry", "fish-seafood": "Fish and seafood", "dairy-eggs": "Dairy and eggs", "plant-proteins": "Plant proteins", "oils-fats": "Oils and fats", "snacks-sweets": "Snacks and sweets" }) },
      { name: "serving_label", label: "Typical serving", type: "text", side: true, max: 60, default: "100 g", placeholder: "1 medium apple" },
      { name: "serving_grams", label: "Serving weight (g)", type: "number", side: true, min: 1, max: 1000, step: 1, default: 100 },
      { name: "fdc_id", label: "USDA FoodData Central ID", type: "number", side: true, min: 1, max: 99999999, step: 1, help: "Optional. Links the row to its USDA record." },
      SLUG,
    ],
  },
  {
    key: "exercises",
    table: "exercises",
    tags: ["exercises"],
    singular: "exercise",
    plural: "Exercises",
    icon: "bolt",
    group: "Library",
    blurb: "The exercise library, with steps, cues and common mistakes.",
    title: "name",
    publicPath: "/exercises/{slug}",
    orderBy: "name COLLATE NOCASE",
    search: ["name", "slug", "primary_muscles", "pattern"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 60 },
      { name: "summary", label: "Summary", type: "textarea", rows: 2, required: true, max: 240 },
      { name: "steps", label: "How to do it", type: "lines", rows: 7, help: "One step per line, in order." },
      { name: "cues", label: "Coaching cues", type: "lines", rows: 4, help: "One per line." },
      { name: "mistakes", label: "Common mistakes", type: "lines", rows: 4, help: "One per line." },
      { name: "easier", label: "Make it easier", type: "text", max: 160 },
      { name: "harder", label: "Make it harder", type: "text", max: 160 },
      STATUS,
      { name: "type", label: "Type", type: "select", side: true, default: "strength", options: opts(EXERCISE_TYPES) },
      { name: "level", label: "Level", type: "select", side: true, default: "beginner", options: opts(EXERCISE_LEVELS) },
      { name: "pattern", label: "Movement pattern", type: "text", side: true, max: 30, placeholder: "squat, hinge, push…" },
      { name: "primary_muscles", label: "Main muscles", type: "csv", side: true },
      { name: "secondary_muscles", label: "Supporting muscles", type: "csv", side: true },
      { name: "equipment", label: "Equipment", type: "csv", side: true, help: `One or more of: ${EXERCISE_EQUIPMENT.join(", ")}.` },
      SLUG,
    ],
  },
  {
    key: "topics",
    table: "categories",
    tags: ["categories", "articles"],
    singular: "topic",
    plural: "Topics",
    icon: "grid",
    group: "Structure",
    blurb: "The sections of the magazine. Each has a colour and a sticker.",
    title: "name",
    publicPath: "/topics/{slug}",
    orderBy: "sort_order, name",
    search: ["name", "slug", "tagline"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 40 },
      { name: "tagline", label: "Tagline", type: "text", max: 80, help: "A few words, shown under the name in menus." },
      { name: "description", label: "Description", type: "textarea", rows: 3, max: 400 },
      STATUS,
      COLOR,
      STICKER,
      ORDER,
      SLUG,
    ],
  },
  {
    key: "body-systems",
    table: "body_systems",
    tags: ["body-systems", "conditions"],
    singular: "body system",
    plural: "Body systems",
    icon: "user",
    group: "Structure",
    blurb: "The regions of the body map. Conditions are filed under these.",
    title: "name",
    publicPath: "/body/{slug}",
    orderBy: "sort_order, name",
    search: ["name", "slug"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 60 },
      { name: "description", label: "Description", type: "textarea", rows: 3, max: 400 },
      { name: "organs", label: "Organs and parts", type: "csv", help: "Separated by commas." },
      { name: "categories", label: "Related topics", type: "csv", help: "Topic URL names, separated by commas." },
      STATUS,
      COLOR,
      STICKER,
      ORDER,
      SLUG,
    ],
  },
  {
    key: "boards",
    table: "forum_boards",
    tags: ["forum-boards"],
    singular: "board",
    plural: "Forum boards",
    icon: "message",
    group: "Structure",
    blurb: "The sections of the community forum.",
    title: "name",
    publicPath: "/community/{slug}",
    orderBy: "sort_order, name",
    search: ["name", "slug"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 50 },
      { name: "description", label: "Description", type: "textarea", rows: 2, max: 200 },
      STATUS,
      COLOR,
      { ...STICKER, default: "chat" },
      ORDER,
      SLUG,
    ],
  },
];

export const COLLECTION_GROUPS: CollectionGroup[] = ["Publishing", "Library", "Structure"];

export function getCollection(key: string): CollectionDef | undefined {
  return COLLECTIONS.find((c) => c.key === key);
}

/** Field types stored as a JSON array. */
export const JSON_FIELD_TYPES: FieldType[] = ["lines", "csv", "sources", "faqs", "micros"];
