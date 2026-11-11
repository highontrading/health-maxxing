"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Spinner } from "@/components/motion/Spinner";
import { SearchHitRow, useSearch } from "@/components/site/HeaderClient";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { useQueryParam } from "@/lib/hooks";
import { SEARCH_TYPE_LABEL } from "@/lib/labels";
import { useResultWave } from "./results";

const SUGGESTIONS = ["protein", "sleep", "blood pressure", "anxiety", "back pain", "creatine", "cholesterol", "migraine", "vitamin D", "heart rate"];
const ORDER = ["article", "condition", "tool", "topic", "term", "myth", "food", "exercise"];

/** Full search page. The query lives in the URL (?q=) so results can be shared. */
export function SearchPageClient({ colorOf }: { colorOf: Record<string, string> }) {
  const router = useRouter();
  // The query starts from ?q= and then follows what the reader types.
  const linked = useQueryParam("q");
  const [typed, setQuery] = useState<string | null>(null);
  const query = typed ?? linked ?? "";
  const [type, setType] = useState("all");
  const { hits, loading } = useSearch(query);
  // The rows of each new answer rise in as a short cascade, and again when a type chip narrows them.
  // The text box itself stays instant.
  const wave = useResultWave();

  // Keep the address bar in step without adding history entries for every keystroke.
  useEffect(() => {
    if (typed === null) return;
    const t = setTimeout(() => {
      const url = typed.trim() ? `/search?q=${encodeURIComponent(typed.trim())}` : "/search";
      if (window.location.pathname + window.location.search !== url) window.history.replaceState(null, "", url);
    }, 300);
    return () => clearTimeout(t);
  }, [typed]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of hits) map.set(h.type, (map.get(h.type) ?? 0) + 1);
    return map;
  }, [hits]);
  const visible = type === "all" ? hits : hits.filter((h) => h.type === type);
  const q = query.trim();
  // An answer has arrived when loading ends. Noticed while rendering, so its rows carry the entrance from
  // their first frame. The last answer is remembered, so coming back to this page with the same query
  // (the address, and with it the query, is briefly different while the page is hidden) plays nothing.
  const answered = !loading && q.length >= 2 ? q : "";
  const [played, setPlayed] = useState("");
  if (answered && answered !== played) {
    setPlayed(answered);
    wave.replay();
  }
  const pickType = (next: string) => {
    if (next === type) return;
    setType(next);
    wave.replay();
  };

  return (
    <div>
      <form
        role="search"
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          router.replace(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
        }}
      >
        <label className="sr-only" htmlFor="site-search">
          Search Health Maxxing
        </label>
        <Icon name="search" size={24} className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-ink-3" />
        <input
          id="site-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setType("all");
          }}
          placeholder="Search articles, conditions, tools…"
          autoComplete="off"
          enterKeyHint="search"
          className="h-[72px] w-full rounded-full border-[1.5px] border-ink bg-paper pl-16 pr-6 text-xl font-medium shadow-[0_6px_0_var(--ink)] outline-none placeholder:text-ink-3 focus:shadow-[0_6px_0_var(--ink),0_0_0_5px_var(--lime-soft)]"
        />
      </form>

      {q.length < 2 ? (
        <div className="mt-10">
          <p className="eyebrow text-ink-3">Popular searches</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="chip chip-outline filter-chip pressable py-2 text-[0.9375rem] hover:border-ink hover:text-ink" onClick={() => setQuery(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-2" role="group" aria-label="Filter results">
            <button type="button" className={cn("chip chip-outline filter-chip pressable py-2", type === "all" && "chip-active")} aria-pressed={type === "all"} onClick={() => pickType("all")}>
              All {hits.length > 0 && <span className="opacity-60">{hits.length}</span>}
            </button>
            {ORDER.filter((t) => counts.has(t)).map((t) => (
              <button key={t} type="button" className={cn("chip chip-outline filter-chip pressable py-2", type === t && "chip-active")} aria-pressed={type === t} onClick={() => pickType(t)}>
                {SEARCH_TYPE_LABEL[t]} <span className="opacity-60">{counts.get(t)}</span>
              </button>
            ))}
          </div>
          <p className="sr-only" role="status" aria-live="polite">
            {loading ? "Searching" : `${visible.length} results for ${q}`}
          </p>
          {visible.length ? (
            <ul className="mt-5 divide-y divide-line">
              {visible.map((hit, i) => {
                const row = wave.row(i);
                return (
                  <li key={hit.type + hit.slug} className={cn("py-1", row.className)} style={row.style}>
                    <SearchHitRow hit={hit} colorOf={colorOf} />
                  </li>
                );
              })}
            </ul>
          ) : (
            // One panel for "searching" and "nothing found": it shows at once and stays put, so typing never
            // makes it jump. When a search comes back empty the sticker bumps and the words fade in.
            <div className="mt-8 flex flex-col items-center rounded-[26px] bg-sand px-6 py-16 text-center">
              <Sticker key={loading ? "searching" : "none"} name="magnifier" size={84} rotate={-8} className={!loading && wave.on ? "bump" : undefined} />
              {loading ? (
                <p className="mt-5 flex items-center gap-2.5 text-xl font-medium">
                  <Spinner size={20} className="text-ink-3" />
                  Searching…
                </p>
              ) : (
                <div className={cn("flex flex-col items-center", wave.region)}>
                  <p className="mt-5 text-xl font-medium">{`Nothing found for “${q}”.`}</p>
                  <p className="mt-2 max-w-md text-ink-3">Try a simpler or broader word, or browse the topics instead.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
