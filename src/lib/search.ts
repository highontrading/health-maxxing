/** Ranking for site search. Pure: takes the cached index and a query. */
import type { SearchDoc } from "./types";

export type SearchHit = Omit<SearchDoc, "text" | "keywords"> & { score: number };

const TYPE_WEIGHT: Record<SearchDoc["type"], number> = {
  article: 1,
  condition: 1.08,
  tool: 1.15,
  topic: 1.05,
  term: 0.9,
  myth: 0.9,
  food: 0.85,
  exercise: 0.85,
};

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 8);
}

export function searchDocs(docs: SearchDoc[], q: string, limit = 40): SearchHit[] {
  const tokens = tokenize(q);
  if (!tokens.length) return [];
  const phrase = tokens.join(" ");
  const hits: SearchHit[] = [];

  for (const doc of docs) {
    const title = doc.title.toLowerCase();
    const keywords = doc.keywords.toLowerCase();
    const summary = doc.summary.toLowerCase();
    const titleWords = title.split(/[^\p{L}\p{N}]+/u);
    let score = 0;
    let matchedAll = true;

    for (const token of tokens) {
      let s = 0;
      if (titleWords.includes(token)) s += 12;
      else if (titleWords.some((w) => w.startsWith(token))) s += 8;
      else if (title.includes(token)) s += 5;
      if (keywords.includes(token)) s += 5;
      if (summary.includes(token)) s += 3;
      if (doc.text) {
        let idx = doc.text.indexOf(token);
        let count = 0;
        while (idx !== -1 && count < 3) {
          count++;
          idx = doc.text.indexOf(token, idx + token.length);
        }
        s += count;
      }
      if (s === 0) {
        matchedAll = false;
        break;
      }
      score += s;
    }
    if (!matchedAll) continue;
    if (tokens.length > 1 && title.includes(phrase)) score += 15;
    if (title === phrase) score += 20;
    score *= TYPE_WEIGHT[doc.type];
    hits.push({
      type: doc.type,
      slug: doc.slug,
      href: doc.href,
      title: doc.title,
      summary: doc.summary,
      category: doc.category,
      sticker: doc.sticker,
      score,
    });
  }
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}
