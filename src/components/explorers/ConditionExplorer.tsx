"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import type { ConditionCard } from "@/lib/types";
import { EmptyState, ResultCount, useResultWave } from "./results";

type System = { slug: string; name: string; color: string; sticker: string };
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** A to Z index of conditions with a text filter and body-system chips. */
export function ConditionExplorer({ conditions, systems }: { conditions: ConditionCard[]; systems: System[] }) {
  const [query, setQuery] = useState("");
  const [system, setSystem] = useState("all");
  // A body-system chip lets the list fade in again as one region; typing swaps it at once.
  const wave = useResultWave();
  const sys = useMemo(() => new Map(systems.map((s) => [s.slug, s])), [systems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conditions.filter(
      (c) =>
        (system === "all" || c.system === system) &&
        (!q || c.name.toLowerCase().includes(q) || c.aka.some((a) => a.toLowerCase().includes(q)) || c.summary.toLowerCase().includes(q)),
    );
  }, [conditions, query, system]);

  const groups = useMemo(() => {
    const map = new Map<string, ConditionCard[]>();
    for (const c of filtered) {
      const letter = (c.name[0] ?? "#").toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : "#";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);
  const present = new Set(groups.map(([l]) => l));

  return (
    <div>
      <label className="relative block w-full max-w-xl">
        <span className="sr-only">Find a condition</span>
        <Icon name="search" size={20} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink-3" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            wave.still();
          }}
          placeholder="Find a condition, e.g. migraine or reflux"
          className="input h-14 rounded-full pl-13 text-lg"
          style={{ paddingLeft: "3.25rem" }}
        />
      </label>

      <div className="scrollbar-none -mx-[var(--gutter)] mt-5 flex gap-2 overflow-x-auto px-[var(--gutter)] py-1" role="group" aria-label="Filter by body system">
        <button
          type="button"
          className={cn("chip chip-outline filter-chip pressable flex-none py-2", system === "all" && "chip-active")}
          aria-pressed={system === "all"}
          onClick={() => {
            if (system !== "all") wave.replay();
            setSystem("all");
          }}
        >
          Whole body
        </button>
        {systems.map((s) => (
          <button
            key={s.slug}
            type="button"
            className={cn(`tone-${s.color}`, "chip filter-chip pressable flex-none py-2", system === s.slug ? "ring-2 ring-ink" : "opacity-90")}
            aria-pressed={system === s.slug}
            onClick={() => {
              setSystem(system === s.slug ? "all" : s.slug);
              wave.replay();
            }}
          >
            <Sticker name={s.sticker} size={18} flat />
            {s.name}
          </button>
        ))}
      </div>

      <nav aria-label="Jump to letter" className="sticky top-[var(--header-h)] z-20 -mx-[var(--gutter)] mt-6 border-y border-line bg-paper/95 px-[var(--gutter)] py-2.5 backdrop-blur">
        <ul className="scrollbar-none flex gap-1 overflow-x-auto">
          {LETTERS.map((l) => (
            <li key={l}>
              {present.has(l) ? (
                <a href={`#letter-${l}`} className="az-letter flex size-9 items-center justify-center rounded-full text-sm font-bold hover:bg-ink hover:text-paper">
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

      <ResultCount
        text={`${filtered.length} ${filtered.length === 1 ? "condition" : "conditions"}${system !== "all" && sys.get(system) ? ` in ${sys.get(system)!.name}` : ""}`}
        fade={wave.on}
      />

      {groups.length === 0 ? (
        <EmptyState sticker="stethoscope" enter={wave.touched}>
          <p className="mt-5 text-xl font-medium">We have not written that one up yet.</p>
          <p className="mt-2 max-w-md text-ink-3">Try a different spelling, or search the whole site.</p>
          <Link href={`/search?q=${encodeURIComponent(query)}`} className="btn btn-outline mt-5">
            Search everything
          </Link>
        </EmptyState>
      ) : (
        <div className={cn("mt-6 space-y-10", wave.region)}>
          {groups.map(([letter, items]) => (
            <section key={letter} id={`letter-${letter}`} className="scroll-mt-36 grid gap-4 md:grid-cols-[80px_1fr]">
              <h2 className="display text-[3.5rem] leading-none text-ink">{letter}</h2>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((c) => {
                  const s = sys.get(c.system);
                  return (
                    <li key={c.slug}>
                      <Link
                        href={`/conditions/${c.slug}`}
                        className={cn(`tone-${s?.color ?? "sand"}`, "explore-card group flex h-full gap-3 rounded-[20px] border-[1.5px] border-line-strong p-4 hover:border-ink hover:bg-tone-soft")}
                      >
                        <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-tone-soft transition-colors duration-(--dur-fast) group-hover:bg-paper">
                          <Sticker name={s?.sticker ?? "stethoscope"} size={28} flat />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold leading-tight tracking-[-0.01em]">{c.name}</span>
                          <span className="mt-1 line-clamp-2 block text-sm leading-snug text-ink-2">{c.summary}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
