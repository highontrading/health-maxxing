/**
 * Markdown to safe HTML for articles, conditions, pages and newsletters,
 * plus a much stricter formatter for user-written forum text.
 */
import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { slugify } from "./content/schema";

export type TocItem = { id: string; text: string; level: 2 | 3 };
export type Rendered = { html: string; toc: TocItem[] };

const CALLOUT_LABELS: Record<string, string> = {
  TIP: "Tip",
  NOTE: "Good to know",
  WARNING: "Heads up",
  DOCTOR: "When to see a doctor",
  STAT: "",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const stripTags = (s: string) => s.replace(/<[^>]+>/g, "");

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "b", "i", "a", "blockquote", "table", "thead",
    "tbody", "tr", "th", "td", "hr", "br", "code", "pre", "sup", "sub", "div", "span", "del", "s",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel", "aria-label"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    div: ["class"],
    p: ["class"],
    span: ["class"],
    sup: ["class"],
    th: ["align", "scope"],
    td: ["align"],
    ol: ["start"],
  },
  allowedClasses: {
    div: ["callout", "callout-tip", "callout-note", "callout-warning", "callout-doctor", "callout-stat", "stat-figure", "stat-body", "table-wrap"],
    p: ["callout-title"],
    sup: ["cite"],
    span: ["nowrap"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const external = /^https?:\/\//i.test(href);
      return {
        tagName,
        attribs: external ? { ...attribs, target: "_blank", rel: "noopener noreferrer" } : attribs,
      };
    },
  },
};

type Callout = { type: string; title: string; body: string };

function extractCallouts(source: string): { text: string; callouts: Callout[] } {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  const callouts: Callout[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^>\s*\[!(TIP|NOTE|WARNING|DOCTOR|STAT)\][ \t]*(.*)$/i);
    if (!m) {
      out.push(lines[i]);
      continue;
    }
    const body: string[] = [];
    let j = i + 1;
    while (j < lines.length && /^>/.test(lines[j])) {
      body.push(lines[j].replace(/^>\s?/, ""));
      j++;
    }
    callouts.push({ type: m[1].toUpperCase(), title: m[2].trim(), body: body.join("\n") });
    out.push("", `HMCALLOUT${callouts.length - 1}END`, "");
    i = j - 1;
  }
  return { text: out.join("\n"), callouts };
}

function linkCitations(html: string, citations: number): string {
  return html.replace(/\[\^(\d+)\]/g, (_, n: string) => {
    const num = Number(n);
    if (!citations || num < 1 || num > citations) return "";
    return `<sup class="cite"><a href="#source-${num}" aria-label="Source ${num}">${num}</a></sup>`;
  });
}

/**
 * Render trusted-ish editorial Markdown. Output is always sanitized.
 * @param citations number of sources; `[^n]` markers become links to `#source-n`.
 */
export function renderMarkdown(source: string, opts: { citations?: number } = {}): Rendered {
  const toc: TocItem[] = [];
  const usedIds = new Map<string, number>();
  const uniqueId = (text: string) => {
    const base = slugify(text) || "section";
    const n = usedIds.get(base) ?? 0;
    usedIds.set(base, n + 1);
    return n ? `${base}-${n + 1}` : base;
  };

  const md = new Marked({ gfm: true, breaks: false });
  md.use({
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const level = Math.min(Math.max(depth, 2), 4);
        const plain = stripTags(inner).replace(/\[\^\d+\]/g, "").trim();
        const id = uniqueId(plain);
        if (level === 2 || level === 3) toc.push({ id, text: plain.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"'), level });
        return `<h${level} id="${id}">${inner}</h${level}>\n`;
      },
      // Raw HTML in the source is dropped rather than passed through.
      html() {
        return "";
      },
      image() {
        return "";
      },
    },
  });

  const { text, callouts } = extractCallouts(source);
  let html = md.parse(text, { async: false }) as string;

  callouts.forEach((c, i) => {
    const inner = (md.parse(c.body, { async: false }) as string).trim();
    const block =
      c.type === "STAT"
        ? `<div class="callout callout-stat"><div class="stat-figure">${esc(c.title)}</div><div class="stat-body">${inner}</div></div>`
        : `<div class="callout callout-${c.type.toLowerCase()}"><p class="callout-title">${esc(c.title || CALLOUT_LABELS[c.type])}</p>${inner}</div>`;
    html = html.replace(new RegExp(`<p>HMCALLOUT${i}END</p>`), () => block);
  });

  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
  html = linkCitations(html, opts.citations ?? 0);
  return { html: sanitizeHtml(html, SANITIZE), toc };
}

/** Plain-text excerpt of a Markdown document. */
export function markdownToText(source: string, max = 0): string {
  const text = source
    .replace(/^>\s*\[!\w+\].*$/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\[\^\d+\]/g, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/^[-:\s]+$/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return max && text.length > max ? text.slice(0, max).replace(/\s+\S*$/, "") + "…" : text;
}

/**
 * Format untrusted forum text. No HTML or Markdown is honoured except:
 * paragraphs, line breaks, "> quote" lines, **bold**, and bare links.
 */
export function renderUserText(source: string): string {
  const blocks = source.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*([^*\n]{1,200})\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[\s(])(https?:\/\/[^\s<>"']{4,300})/g, (_, pre: string, url: string) => {
        const trail = url.match(/[.,;:!?)]+$/)?.[0] ?? "";
        const clean = trail ? url.slice(0, -trail.length) : url;
        const label = clean.length > 60 ? clean.slice(0, 57) + "…" : clean;
        return `${pre}<a href="${clean}" target="_blank" rel="nofollow ugc noopener noreferrer">${label}</a>${trail}`;
      });
  return blocks
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((l) => /^>\s?/.test(l))) {
        return `<blockquote>${lines.map((l) => inline(l.replace(/^>\s?/, ""))).join("<br>")}</blockquote>`;
      }
      return `<p>${lines.map(inline).join("<br>")}</p>`;
    })
    .join("");
}
