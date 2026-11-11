"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { FOOD_GROUPS } from "@/lib/labels";
import type { Food } from "@/lib/types";
import { EmptyState, ResultCount, useResultWave } from "./results";

type SortKey = "name" | "kcal" | "protein" | "carbs" | "fiber" | "fat";
const COLUMNS: { key: Exclude<SortKey, "name">; label: string; unit: string; dp: number }[] = [
  { key: "kcal", label: "Calories", unit: "kcal", dp: 0 },
  { key: "protein", label: "Protein", unit: "g", dp: 1 },
  { key: "carbs", label: "Carbs", unit: "g", dp: 1 },
  { key: "fiber", label: "Fiber", unit: "g", dp: 1 },
  { key: "fat", label: "Fat", unit: "g", dp: 1 },
];
const PRESETS: { label: string; sort: SortKey; dir: "asc" | "desc" }[] = [
  { label: "Most protein", sort: "protein", dir: "desc" },
  { label: "Most fiber", sort: "fiber", dir: "desc" },
  { label: "Fewest calories", sort: "kcal", dir: "asc" },
];

/** The arrow beside the sorted column. It turns over when the direction flips. */
function SortArrow({ up, enter }: { up: boolean; enter: boolean }) {
  // Decided when the arrow appears: it pops in when a click moved it to this column, not on the first
  // load and not when the table merely comes back while the visitor types. The class comes off once it
  // has played, so it cannot play again when the page is shown a second time.
  const [entering, setEntering] = useState(enter);
  return (
    <Icon
      name="arrow-down"
      size={12}
      className={cn("sort-arrow", entering && "sort-arrow-enter", up && "rotate-180")}
      onAnimationEnd={() => setEntering(false)}
    />
  );
}

/** Sortable, filterable nutrient table. Values are per 100 g or per serving. */
export function FoodExplorer({ foods }: { foods: Food[] }) {
  const [group, setGroup] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [basis, setBasis] = useState<"100g" | "serving">("100g");
  // Controls let the table body fade in again as one piece; typing swaps the rows at once.
  const wave = useResultWave();

  const groups = useMemo(() => Object.keys(FOOD_GROUPS).filter((g) => foods.some((f) => f.group === g)), [foods]);
  const scale = (f: Food) => (basis === "100g" ? 1 : f.servingGrams / 100);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = foods.filter((f) => (group === "all" || f.group === group) && (!q || f.name.toLowerCase().includes(q)));
    const factor = (f: Food) => (basis === "100g" ? 1 : f.servingGrams / 100);
    return [...list].sort((a, b) => {
      const cmp = sort === "name" ? a.name.localeCompare(b.name) : a[sort] * factor(a) - b[sort] * factor(b);
      return dir === "asc" ? cmp : -cmp;
    });
  }, [foods, group, query, sort, dir, basis]);

  const toggleSort = (key: SortKey) => {
    if (sort === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDir(key === "name" ? "asc" : "desc");
    }
    wave.replay();
  };
  const fmt = (v: number, dp: number) => (dp === 0 ? String(Math.round(v)) : v.toFixed(dp));

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block w-full max-w-sm">
          <span className="sr-only">Find a food</span>
          <Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              wave.still();
            }}
            placeholder="Find a food, e.g. lentils"
            className="input rounded-full pl-11"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={cn("chip chip-outline filter-chip pressable py-2", sort === p.sort && dir === p.dir && "chip-active")}
              onClick={() => {
                if (sort === p.sort && dir === p.dir) return;
                setSort(p.sort);
                setDir(p.dir);
                wave.replay();
              }}
            >
              {p.label}
            </button>
          ))}
          {/* Two equal halves, so one thumb can slide between them without being measured. */}
          <div role="group" aria-label="Show values" className="relative inline-grid grid-cols-2 whitespace-nowrap rounded-full border-[1.5px] border-ink p-0.5 text-sm font-semibold">
            <span
              aria-hidden="true"
              className={cn("basis-toggle-thumb pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full bg-ink", basis === "serving" && "translate-x-full")}
            />
            {(["100g", "serving"] as const).map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={basis === b}
                onClick={() => {
                  if (basis === b) return;
                  setBasis(b);
                  wave.replay();
                }}
                className={cn("basis-toggle-option relative rounded-full px-3 py-1.5", basis === b ? "text-paper" : "text-ink-2")}
              >
                {b === "100g" ? "Per 100 g" : "Per serving"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="scrollbar-none -mx-[var(--gutter)] mt-5 flex gap-2 overflow-x-auto px-[var(--gutter)] py-1" role="group" aria-label="Filter by food group">
        <button
          type="button"
          className={cn("chip chip-outline filter-chip pressable flex-none py-2", group === "all" && "chip-active")}
          aria-pressed={group === "all"}
          onClick={() => {
            if (group !== "all") wave.replay();
            setGroup("all");
          }}
        >
          All foods
        </button>
        {groups.map((g) => (
          <button
            key={g}
            type="button"
            className={cn(`tone-${FOOD_GROUPS[g].color}`, "chip filter-chip pressable flex-none py-2", group === g ? "ring-2 ring-ink" : "opacity-90")}
            aria-pressed={group === g}
            onClick={() => {
              setGroup(group === g ? "all" : g);
              wave.replay();
            }}
          >
            <Sticker name={FOOD_GROUPS[g].sticker} size={18} flat />
            {FOOD_GROUPS[g].label}
          </button>
        ))}
      </div>

      <ResultCount text={`${rows.length} ${rows.length === 1 ? "food" : "foods"} · values ${basis === "100g" ? "per 100 g" : "per typical serving"}`} fade={wave.on} />

      {rows.length === 0 ? (
        <EmptyState sticker="apple" enter={wave.on}>
          <p className="mt-5 text-xl font-medium">That food is not in the database yet.</p>
        </EmptyState>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-[22px] border-[1.5px] border-ink">
          <table className="w-full min-w-[640px] border-collapse text-left text-[0.9375rem]">
            <thead>
              <tr className="bg-sand text-xs">
                <th scope="col" className="sticky left-0 z-10 bg-sand px-4 py-3" aria-sort={sort === "name" ? (dir === "asc" ? "ascending" : "descending") : "none"}>
                  <button type="button" className="inline-flex items-center gap-1 font-bold uppercase tracking-wide" onClick={() => toggleSort("name")}>
                    Food {sort === "name" && <SortArrow up={dir === "desc"} enter={wave.on} />}
                  </button>
                </th>
                {COLUMNS.map((col) => (
                  <th key={col.key} scope="col" className="px-3 py-3 text-right" aria-sort={sort === col.key ? (dir === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" className={cn("inline-flex items-center gap-1 font-bold uppercase tracking-wide", sort === col.key && "underline underline-offset-4")} onClick={() => toggleSort(col.key)}>
                      {col.label}
                      {sort === col.key && <SortArrow up={dir === "asc"} enter={wave.on} />}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={wave.region}>
              {rows.map((f) => {
                const g = FOOD_GROUPS[f.group] ?? FOOD_GROUPS.vegetables;
                const k = scale(f);
                return (
                  <tr key={f.slug} className={cn(`tone-${g.color}`, "group border-t border-line transition-colors duration-(--dur-fast) hover:bg-tone-soft")}>
                    <th scope="row" className="sticky left-0 z-10 bg-paper px-4 py-2.5 font-medium transition-colors duration-(--dur-fast) group-hover:bg-tone-soft">
                      <Link href={`/foods/${f.slug}`} className="flex items-center gap-3">
                        <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-tone-soft transition-colors duration-(--dur-fast) group-hover:bg-paper">
                          <Sticker name={g.sticker} size={20} flat />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold leading-tight underline-offset-4 group-hover:underline">{f.name}</span>
                          <span className="block text-xs font-normal text-ink-3">{basis === "100g" ? g.label : `${f.servingLabel} (${Math.round(f.servingGrams)} g)`}</span>
                        </span>
                      </Link>
                    </th>
                    {COLUMNS.map((col) => (
                      <td key={col.key} className={cn("px-3 py-2.5 text-right tabular-nums", sort === col.key && "font-semibold")}>
                        {fmt(f[col.key] * k, col.dp)}
                        <span className="ml-0.5 text-xs text-ink-3">{col.unit === "kcal" ? "" : col.unit}</span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
