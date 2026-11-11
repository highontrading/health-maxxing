"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { EXERCISE_TYPES, LEVEL_LABEL } from "@/lib/labels";
import type { Exercise } from "@/lib/types";
import { EmptyState, ResultCount, useResultWave } from "./results";

/** Filterable exercise library. */
export function ExerciseExplorer({ exercises }: { exercises: Exercise[] }) {
  const [type, setType] = useState("all");
  const [level, setLevel] = useState("all");
  const [muscle, setMuscle] = useState("all");
  const [noGear, setNoGear] = useState(false);
  const [query, setQuery] = useState("");
  // Controls let the cards enter again; typing swaps them at once.
  const wave = useResultWave();

  const muscles = useMemo(() => Array.from(new Set(exercises.flatMap((e) => e.primary))).sort(), [exercises]);
  const types = useMemo(() => Object.keys(EXERCISE_TYPES).filter((t) => exercises.some((e) => e.type === t)), [exercises]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter(
      (e) =>
        (type === "all" || e.type === type) &&
        (level === "all" || e.level === level) &&
        (muscle === "all" || e.primary.includes(muscle) || e.secondary.includes(muscle)) &&
        (!noGear || e.equipment.every((x) => x === "bodyweight" || x === "mat")) &&
        (!q || e.name.toLowerCase().includes(q) || e.pattern.includes(q) || e.primary.some((m) => m.toLowerCase().includes(q))),
    );
  }, [exercises, type, level, muscle, noGear, query]);

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block w-full max-w-sm">
          <span className="sr-only">Find an exercise</span>
          <Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              wave.still();
            }}
            placeholder="Find an exercise, e.g. squat"
            className="input rounded-full pl-11"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <label className="sr-only" htmlFor="ex-level">Level</label>
          <select
            id="ex-level"
            className="select w-auto rounded-full py-2 text-sm font-medium"
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              wave.replay();
            }}
          >
            <option value="all">Any level</option>
            {Object.entries(LEVEL_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="ex-muscle">Muscle</label>
          <select
            id="ex-muscle"
            className="select w-auto rounded-full py-2 text-sm font-medium"
            value={muscle}
            onChange={(e) => {
              setMuscle(e.target.value);
              wave.replay();
            }}
          >
            <option value="all">Any muscle</option>
            {muscles.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <label className={cn("chip chip-outline filter-chip pressable cursor-pointer py-2", noGear && "chip-active")}>
            <input
              type="checkbox"
              className="sr-only"
              checked={noGear}
              onChange={(e) => {
                setNoGear(e.target.checked);
                wave.replay();
              }}
            />
            No equipment
          </label>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by type">
        <button
          type="button"
          className={cn("chip chip-outline filter-chip pressable py-2", type === "all" && "chip-active")}
          aria-pressed={type === "all"}
          onClick={() => {
            if (type !== "all") wave.replay();
            setType("all");
          }}
        >
          Everything
        </button>
        {types.map((t) => (
          <button
            key={t}
            type="button"
            className={cn(`tone-${EXERCISE_TYPES[t].color}`, "chip filter-chip pressable py-2", type === t ? "ring-2 ring-ink" : "opacity-90")}
            aria-pressed={type === t}
            onClick={() => {
              setType(type === t ? "all" : t);
              wave.replay();
            }}
          >
            <Sticker name={EXERCISE_TYPES[t].sticker} size={18} flat />
            {EXERCISE_TYPES[t].label}
          </button>
        ))}
      </div>

      <ResultCount text={`${filtered.length} ${filtered.length === 1 ? "exercise" : "exercises"}`} fade={wave.on} />

      {filtered.length ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e, i) => {
            const t = EXERCISE_TYPES[e.type] ?? EXERCISE_TYPES.strength;
            return (
              <li key={e.slug} {...wave.row(i)}>
                <Link href={`/exercises/${e.slug}`} className={cn(`tone-${t.color}`, "explore-card group flex h-full flex-col rounded-[22px] border-[1.5px] border-line-strong p-5 hover:border-ink hover:bg-tone-soft")}>
                  <span className="flex items-center justify-between gap-3">
                    <span className="chip py-1">{t.label}</span>
                    <span className="eyebrow text-ink-3">{LEVEL_LABEL[e.level] ?? e.level}</span>
                  </span>
                  <span className="mt-4 text-[1.3125rem] font-semibold leading-tight tracking-[-0.02em]">{e.name}</span>
                  <span className="mt-2 line-clamp-2 text-[0.9375rem] leading-snug text-ink-2">{e.summary}</span>
                  <span className="mt-auto flex flex-wrap gap-1.5 pt-4 text-xs font-semibold text-ink-2">
                    {e.primary.slice(0, 3).map((m) => (
                      <span key={m} className="rounded-full bg-sand px-2.5 py-1 transition-colors duration-(--dur-fast) group-hover:bg-paper">{m}</span>
                    ))}
                    <span className="rounded-full border border-line-strong px-2.5 py-1 capitalize">{e.equipment.slice(0, 2).join(", ")}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState sticker="dumbbell" enter={wave.on}>
          <p className="mt-5 text-xl font-medium">No exercises match those filters.</p>
          <button
            type="button"
            className="btn btn-outline mt-5"
            onClick={() => {
              setType("all");
              setLevel("all");
              setMuscle("all");
              setNoGear(false);
              setQuery("");
              wave.replay();
            }}
          >
            Clear filters
          </button>
        </EmptyState>
      )}
    </div>
  );
}
