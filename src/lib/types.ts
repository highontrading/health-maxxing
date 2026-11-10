/** Shapes handed to pages and components. Plain data only. */

export type ColorKey =
  | "lime" | "orange" | "indigo" | "lilac" | "pink" | "yellow" | "teal" | "rose"
  | "sky" | "peach" | "tan" | "green" | "mint" | "plum" | "sand" | "blue";

export type Source = { title: string; publisher: string; url: string; year?: number };
export type Faq = { q: string; a: string };

export type Category = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  color: ColorKey;
  sticker: string;
  order: number;
  articleCount: number;
};

export type BodySystem = {
  slug: string;
  name: string;
  description: string;
  color: ColorKey;
  sticker: string;
  organs: string[];
  categories: string[];
  order: number;
  conditionCount: number;
};

export type ArticleCard = {
  slug: string;
  title: string;
  dek: string;
  summary: string;
  category: string;
  sticker: string;
  kind: string;
  featured: boolean;
  readingMinutes: number;
  publishedAt: string | null;
  coverImage: string;
  tags: string[];
};

export type Article = ArticleCard & {
  body: string;
  takeaways: string[];
  faqs: Faq[];
  sources: Source[];
  related: string[];
  author: string;
  reviewedAt: string | null;
  updatedAt: string;
  wordCount: number;
  coverAlt: string;
  coverCredit: string;
  seoTitle: string;
  seoDescription: string;
  factCheck: string;
};

export type ConditionCard = {
  slug: string;
  name: string;
  aka: string[];
  system: string;
  category: string;
  summary: string;
};

export type Condition = ConditionCard & {
  symptoms: string[];
  urgent: string[];
  body: string;
  sources: Source[];
  reviewedAt: string | null;
  updatedAt: string;
  factCheck: string;
};

export type GlossaryTerm = { slug: string; term: string; definition: string; category: string; seeAlso: string[] };

export type Myth = {
  slug: string;
  myth: string;
  verdict: "false" | "misleading" | "partly-true" | "true";
  answer: string;
  explanation: string;
  category: string;
  sticker: string;
  sources: Source[];
};

export type Micro = { name: string; amount: number; unit: string };
export type Food = {
  slug: string;
  name: string;
  group: string;
  fdcId: number | null;
  servingLabel: string;
  servingGrams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fiber: number;
  sugars: number;
  fat: number;
  satFat: number;
  sodiumMg: number;
  micros: Micro[];
  note: string;
};

export type Exercise = {
  slug: string;
  name: string;
  type: string;
  pattern: string;
  primary: string[];
  secondary: string[];
  equipment: string[];
  level: string;
  summary: string;
  steps: string[];
  cues: string[];
  mistakes: string[];
  easier: string;
  harder: string;
};

export type StaticPage = { slug: string; title: string; description: string; body: string; updatedAt: string };

export type NewsletterIssue = {
  slug: string;
  number: number;
  title: string;
  preheader: string;
  sticker: string;
  body: string;
  publishedAt: string | null;
};

export type SiteStats = {
  articles: number;
  conditions: number;
  glossary: number;
  myths: number;
  foods: number;
  exercises: number;
  categories: number;
  tools: number;
};

export type SearchDoc = {
  type: "article" | "condition" | "term" | "myth" | "food" | "exercise" | "tool" | "topic";
  slug: string;
  href: string;
  title: string;
  summary: string;
  category: string;
  sticker: string;
  keywords: string;
  text: string;
};

export type SessionUser = {
  id: number;
  email: string;
  handle: string;
  name: string;
  role: "member" | "editor" | "admin";
  sticker: string;
  color: ColorKey;
  banned: boolean;
};
