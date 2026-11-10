"use client";

import { useMemo, useState } from "react";
import { MythCard } from "@/components/MythCard";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { VERDICT } from "@/lib/labels";
import type { Myth } from "@/lib/types";

type Cat = { slug: string; name: string; color: string; sticker: string };

export function MythExplorer({ myths, categories }: { myths: Myth[]; categories: Cat[] }) {
  const [verdict, setVerdict] = useState("all");
  const [topic, setTopic] = useState("all");
  const topics = useMemo(() => categories.filter((c) => myths.some((m) => m.category === c.slug)), [categories, myths]);
  const filtered = useMemo(
    () => myths.filter((m) => (verdict === "all" || m.verdict === verdict) && (topic === "all" || m.category === topic)),
    [myths, verdict, topic],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by verdict">
        <button type="button" className={cn("chip chip-outline py-2", verdict === "all" && "chip-active")} aria-pressed={verdict === "all"} onClick={() => setVerdict("all")}>
          Any verdict
        </button>
        {Object.entries(VERDICT).map(([key, v]) => (
          <button key={key} type="button" className={cn(`tone-${v.tone}`, "chip py-2", verdict === key ? "ring-2 ring-ink" : "opacity-90")} aria-pressed={verdict === key} onClick={() => setVerdict(verdict === key ? "all" : key)}>
            <Sticker name={v.sticker} size={18} flat />
            {v.label}
          </button>
        ))}
      </div>
      <div className="scrollbar-none -mx-[var(--gutter)] mt-3 flex gap-2 overflow-x-auto px-[var(--gutter)] py-1" role="group" aria-label="Filter by topic">
        <button type="button" className={cn("chip chip-outline flex-none py-2", topic === "all" && "chip-active")} aria-pressed={topic === "all"} onClick={() => setTopic("all")}>
          All topics
        </button>
        {topics.map((c) => (
          <button key={c.slug} type="button" className={cn(`tone-${c.color}`, "chip flex-none py-2", topic === c.slug ? "ring-2 ring-ink" : "opacity-90")} aria-pressed={topic === c.slug} onClick={() => setTopic(topic === c.slug ? "all" : c.slug)}>
            <Sticker name={c.sticker} size={18} flat />
            {c.name}
          </button>
        ))}
      </div>
      <p className="mt-6 text-sm text-ink-3" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "claim" : "claims"}. Tap one to see the verdict.
      </p>
      {filtered.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <MythCard key={m.slug} myth={m} detailed />
          ))}
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center rounded-[26px] bg-sand px-6 py-16 text-center">
          <Sticker name="magnifier" size={84} rotate={-8} />
          <p className="mt-5 text-xl font-medium">No claims match those filters.</p>
        </div>
      )}
    </div>
  );
}
