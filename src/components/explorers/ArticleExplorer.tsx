"use client";

import { useMemo, useState } from "react";
import { useQueryParam } from "@/lib/hooks";
import { ArticleCard } from "@/components/ArticleCard";
import { Icon } from "@/components/Icon";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { KIND_LABEL } from "@/lib/format";
import type { ArticleCard as Card } from "@/lib/types";
import { EmptyState, ResultCount, useResultWave } from "./results";

type Cat = { slug: string; name: string; color: string; sticker: string };
const PAGE = 18;

/** Filterable grid of every article. Filtering happens in the browser. */
export function ArticleExplorer({ articles, categories }: { articles: Card[]; categories: Cat[] }) {
  // Deep links such as /articles?topic=sleep set the starting topic until the reader picks one.
  const linked = useQueryParam("topic");
  const [picked, setTopic] = useState<string | null>(null);
  const topic = picked ?? (linked && categories.some((c) => c.slug === linked) ? linked : "all");
  const [kind, setKind] = useState("all");
  const [sort, setSort] = useState<"new" | "quick" | "az">("new");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  // Controls let the cards enter again; typing swaps them at once.
  const wave = useResultWave();
  const cat = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);

  const kinds = useMemo(() => Array.from(new Set(articles.map((a) => a.kind))), [articles]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = articles.filter(
      (a) =>
        (topic === "all" || a.category === topic) &&
        (kind === "all" || a.kind === kind) &&
        (!q || a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) || a.tags.some((t) => t.includes(q))),
    );
    if (sort === "quick") return [...list].sort((a, b) => a.readingMinutes - b.readingMinutes);
    if (sort === "az") return [...list].sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [articles, topic, kind, sort, query]);

  const reset = () => setShown(PAGE);

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full max-w-sm">
          <span className="sr-only">Filter articles</span>
          <Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              reset();
              wave.still();
            }}
            placeholder="Filter by word, e.g. protein"
            className="input rounded-full pl-11"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="kind">
            Format
          </label>
          <select
            id="kind"
            className="select w-auto rounded-full py-2 text-sm font-medium"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              reset();
              wave.replay();
            }}
          >
            <option value="all">All formats</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k] ?? k}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="sort">
            Sort
          </label>
          <select
            id="sort"
            className="select w-auto rounded-full py-2 text-sm font-medium"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as typeof sort);
              wave.replay();
            }}
          >
            <option value="new">Newest first</option>
            <option value="quick">Quickest reads</option>
            <option value="az">A to Z</option>
          </select>
        </div>
      </div>

      <div className="scrollbar-none -mx-[var(--gutter)] mt-5 flex gap-2 overflow-x-auto px-[var(--gutter)] pb-1 pt-1" role="group" aria-label="Filter by topic">
        <button
          type="button"
          className={cn("chip chip-outline filter-chip pressable flex-none py-2", topic === "all" && "chip-active")}
          aria-pressed={topic === "all"}
          onClick={() => {
            if (topic !== "all") wave.replay();
            setTopic("all");
            reset();
          }}
        >
          All topics
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            className={cn(`tone-${c.color}`, "chip filter-chip pressable flex-none py-2", topic === c.slug ? "ring-2 ring-ink" : "opacity-90")}
            aria-pressed={topic === c.slug}
            onClick={() => {
              setTopic(topic === c.slug ? "all" : c.slug);
              reset();
              wave.replay();
            }}
          >
            <Sticker name={c.sticker} size={18} flat />
            {c.name}
          </button>
        ))}
      </div>

      <ResultCount
        text={`${filtered.length} ${filtered.length === 1 ? "article" : "articles"}${topic !== "all" && cat.get(topic) ? ` in ${cat.get(topic)!.name}` : ""}`}
        fade={wave.on}
      />

      {filtered.length ? (
        <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {/* The wrapper carries the entrance, so the card keeps its own hover and press motion. */}
          {filtered.slice(0, shown).map((a, i) => (
            <div key={a.slug} {...wave.row(i)}>
              <ArticleCard article={a} category={cat.get(a.category)} headingLevel={2} className="h-full" />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState sticker="magnifier" enter={wave.touched}>
          <p className="mt-5 text-xl font-medium">Nothing matches that yet.</p>
          <button
            type="button"
            className="btn btn-outline mt-5"
            onClick={() => {
              setTopic("all");
              setKind("all");
              setQuery("");
              reset();
              wave.replay();
            }}
          >
            Clear filters
          </button>
        </EmptyState>
      )}

      {filtered.length > shown && (
        <div className="mt-12 flex justify-center">
          <button
            type="button"
            className="btn btn-outline btn-lg"
            onClick={() => {
              // Only the cards that are added enter; the ones already on screen stay still.
              wave.extend(shown);
              setShown((s) => s + PAGE);
            }}
          >
            Show more <span className="text-ink-3">({filtered.length - shown} left)</span>
          </button>
        </div>
      )}
    </div>
  );
}
