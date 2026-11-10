"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import type { GlossaryTerm } from "@/lib/types";

type Cat = { slug: string; name: string; color: string };
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const slugOf = (term: string) =>
  term
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** A to Z glossary with a text filter. Each term has an anchor so it can be linked to. */
export function GlossaryExplorer({ terms, categories }: { terms: GlossaryTerm[]; categories: Cat[] }) {
  const [query, setQuery] = useState("");
  const [flash, setFlash] = useState("");
  const cat = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);
  const known = useMemo(() => new Set(terms.map((t) => t.slug)), [terms]);

  // Highlight the term named in the URL hash, including after in-page jumps.
  useEffect(() => {
    const apply = () => setFlash(decodeURIComponent(window.location.hash.slice(1)));
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? terms.filter((t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)) : terms;
  }, [terms, query]);

  const groups = useMemo(() => {
    const map = new Map<string, GlossaryTerm[]>();
    for (const t of filtered) {
      const first = t.term[0]?.toUpperCase() ?? "#";
      const key = /[A-Z]/.test(first) ? first : "#";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);
  const present = new Set(groups.map(([l]) => l));

  return (
    <div>
      <label className="relative block w-full max-w-xl">
        <span className="sr-only">Find a term</span>
        <Icon name="search" size={20} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink-3" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a term, e.g. HbA1c" className="input h-14 rounded-full text-lg" style={{ paddingLeft: "3.25rem" }} />
      </label>

      <nav aria-label="Jump to letter" className="sticky top-[var(--header-h)] z-20 -mx-[var(--gutter)] mt-6 border-y border-line bg-paper/95 px-[var(--gutter)] py-2.5 backdrop-blur">
        <ul className="scrollbar-none flex gap-1 overflow-x-auto">
          {LETTERS.map((l) => (
            <li key={l}>
              {present.has(l) ? (
                <a href={`#letter-${l}`} className="flex size-9 items-center justify-center rounded-full text-sm font-bold hover:bg-ink hover:text-paper">
                  {l}
                </a>
              ) : (
                <span className="flex size-9 items-center justify-center text-sm font-bold text-ink-3/40" aria-hidden="true">
                  {l}
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <p className="mt-6 text-sm text-ink-3" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "term" : "terms"}
      </p>

      {groups.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-[26px] bg-sand px-6 py-16 text-center">
          <Sticker name="chat" size={84} rotate={-8} />
          <p className="mt-5 text-xl font-medium">We have not defined that one yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-12">
          {groups.map(([letter, items]) => (
            <section key={letter} id={`letter-${letter}`} className="grid scroll-mt-36 gap-4 md:grid-cols-[80px_1fr]">
              <h2 className="display text-[3.5rem] leading-none">{letter}</h2>
              <dl className="grid gap-x-10 gap-y-0 lg:grid-cols-2">
                {items.map((t) => {
                  const c = cat.get(t.category);
                  return (
                    <div key={t.slug} id={t.slug} className={cn(`tone-${c?.color ?? "sand"}`, "scroll-mt-40 border-t-[1.5px] border-ink px-3 py-4 transition-colors duration-700", flash === t.slug && "bg-tone-soft")}>
                      <dt className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="text-[1.1875rem] font-semibold tracking-[-0.015em]">{t.term}</span>
                        {c && <span className="eyebrow text-tone-ink">{c.name}</span>}
                      </dt>
                      <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-2">
                        {t.definition}
                        {t.seeAlso.length > 0 && (
                          <span className="mt-2 block text-[0.8125rem] text-ink-3">
                            See also:{" "}
                            {t.seeAlso.map((s, i) => {
                              const target = slugOf(s);
                              return (
                                <span key={s}>
                                  {i > 0 && ", "}
                                  {known.has(target) ? (
                                    <a href={`#${target}`} className="font-medium text-ink underline underline-offset-2">
                                      {s}
                                    </a>
                                  ) : (
                                    s
                                  )}
                                </span>
                              );
                            })}
                          </span>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
