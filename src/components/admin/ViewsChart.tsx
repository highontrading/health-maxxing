"use client";

import { useRef, useState } from "react";
import { usePresence } from "@/components/motion/presence";
import { cn } from "@/lib/cn";

export type DayPoint = { day: string; views: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2026-11-03" -> "3 Nov" (dates are plain UTC days, so no time zone maths). */
function shortDay(day: string): string {
  const [, m, d] = day.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}
function longDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  return `${WEEKDAYS[date.getUTCDay()]} ${shortDay(day)}`;
}

/** Round the axis up to a clean number and pick four or five ticks. */
function niceScale(max: number): { top: number; ticks: number[] } {
  if (max <= 4) return { top: 4, ticks: [0, 1, 2, 3, 4] };
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v));
  return { top, ticks };
}

const compact = (v: number) => (v >= 10_000 ? `${Math.round(v / 1000)}K` : v.toLocaleString("en-US"));

/**
 * Page views per day: one series, so one colour and no legend. Marks are drawn
 * in a stretched SVG; every label is HTML so text never distorts. Hover, focus
 * and the arrow keys move a crosshair; the table view lists the same numbers.
 * Motion is opacity only: the crosshair and tooltip fade, the two views swap
 * with a fade, and the line itself is drawn once and stays still.
 */
export function ViewsChart({ series }: { series: DayPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  // The chart the page arrives with stays still. A view only fades in once the button has swapped it.
  const [swapped, setSwapped] = useState(false);
  const plot = useRef<HTMLDivElement>(null);
  // The crosshair fades out where it last was, so the day is remembered after the pointer has left.
  const hover = usePresence(active !== null);
  const [held, setHeld] = useState(0);
  if (active !== null && active !== held) setHeld(active);

  const count = series.length;
  const total = series.reduce((sum, p) => sum + p.views, 0);
  const { top, ticks } = niceScale(Math.max(...series.map((p) => p.views), 0));
  const x = (i: number) => (count <= 1 ? 50 : (i / (count - 1)) * 100);
  const y = (v: number) => 100 - (v / top) * 100;
  const line = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(2)} ${y(p.views).toFixed(2)}`).join(" ");
  const area = `${line} L100 100 L0 100 Z`;

  // About six date labels along the bottom, always including both ends.
  const every = Math.max(1, Math.round((count - 1) / 5));
  const labelled = series.map((_, i) => i).filter((i) => i === count - 1 || (i % every === 0 && count - 1 - i >= every / 2));

  const pick = (clientX: number) => {
    const rect = plot.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setActive(Math.round(fraction * (count - 1)));
  };
  const at = Math.min(active ?? held, count - 1);
  const shown = series[at];
  const last = series[count - 1];

  return (
    <figure className="viz-root">
      <div className="mb-3 flex items-center justify-between gap-3">
        <figcaption className="text-[0.9375rem] font-semibold">Page views per day</figcaption>
        {/* min-w fits the longer label, so the button keeps its width (and stays under the pointer) when the words change. */}
        <button
          type="button"
          className="btn btn-ghost btn-sm min-w-28"
          aria-pressed={table}
          onClick={() => {
            setTable((v) => !v);
            setSwapped(true);
          }}
        >
          {table ? "Show chart" : "Show as table"}
        </button>
      </div>

      {/* The two views are the same height, so swapping them moves nothing below. */}
      {table ? (
        <div key="table" className="views-chart-view max-h-[248px] overflow-y-auto rounded-xl border border-line">
          <table className="admin-table">
            <thead className="sticky top-0 bg-paper">
              <tr>
                <th>Day</th>
                <th className="num">Page views</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((p) => (
                <tr key={p.day}>
                  <td>{longDay(p.day)}</td>
                  <td className="num">{p.views.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div key="chart" className={cn(swapped && "views-chart-view")}>
          <div className="flex">
            <div className="relative h-[220px] w-10 flex-none" aria-hidden="true">
              {ticks.map((t) => (
                <span key={t} className="absolute right-2 -translate-y-1/2 text-xs tabular-nums text-ink-3" style={{ top: `${y(t)}%` }}>
                  {compact(t)}
                </span>
              ))}
            </div>
            <div
              ref={plot}
              role="img"
              tabIndex={0}
              aria-label={`Line chart of page views per day over ${count} days. ${total.toLocaleString("en-US")} views in total. Use the arrow keys to read each day.`}
              className="relative h-[220px] min-w-0 flex-1 cursor-crosshair touch-pan-y rounded-sm outline-offset-4"
              onPointerMove={(e) => pick(e.clientX)}
              onPointerDown={(e) => pick(e.clientX)}
              onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
              onFocus={() => setActive((a) => a ?? count - 1)}
              onBlur={() => setActive(null)}
              onKeyDown={(e) => {
                const move = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
                if (move) {
                  e.preventDefault();
                  setActive((a) => Math.min(count - 1, Math.max(0, (a ?? count - 1) + move)));
                } else if (e.key === "Home") setActive(0);
                else if (e.key === "End") setActive(count - 1);
                else if (e.key === "Escape") setActive(null);
              }}
            >
              {ticks.map((t) => (
                <span key={t} className={cn("absolute inset-x-0 h-px", t === 0 ? "bg-[var(--viz-axis)]" : "bg-[var(--viz-grid)]")} style={{ top: `${y(t)}%` }} />
              ))}
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
                <path d={area} fill="var(--viz-series)" opacity="0.1" />
                <path d={line} fill="none" stroke="var(--viz-series)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </svg>

              {total === 0 && (
                <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-ink-3">
                  {/* A surface-coloured pad keeps the gridline from running through the words. */}
                  <span className="rounded-md bg-[var(--viz-surface)] px-2 py-1">No page views were recorded in this period. Views are counted on article and condition pages.</span>
                </p>
              )}

              {/* The latest value, labelled at the end of the line. */}
              {total > 0 && active === null && (
                <>
                  <span className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--viz-series)] ring-2 ring-[var(--viz-surface)]" style={{ left: "100%", top: `${y(last.views)}%` }} />
                  <span
                    className="absolute right-0 rounded-md bg-[var(--viz-surface)] px-1 text-xs font-semibold tabular-nums text-ink"
                    style={{ top: `max(0px, calc(${y(last.views)}% - 26px))` }}
                  >
                    {last.views.toLocaleString("en-US")}
                  </span>
                </>
              )}

              {/* Crosshair, point and tooltip fade in and out as one layer. It follows the pointer at once; only its opacity eases. */}
              {hover.mounted && shown && (
                <div className="views-chart-hover motion-fade pointer-events-none absolute inset-0" data-state={hover.state}>
                  <span className="absolute inset-y-0 w-px bg-ink-3" style={{ left: `${x(at)}%` }} />
                  <span className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--viz-series)] ring-2 ring-[var(--viz-surface)]" style={{ left: `${x(at)}%`, top: `${y(shown.views)}%` }} />
                  <div
                    role="status"
                    className={cn(
                      "pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-xl border border-line bg-[var(--viz-surface)] px-3 py-2 shadow-[var(--shadow-card)]",
                      x(at) > 55 ? "-translate-x-[calc(100%+10px)]" : "translate-x-[10px]",
                    )}
                    style={{ left: `${x(at)}%` }}
                  >
                    <p className="text-[1.0625rem] font-semibold leading-tight text-ink">
                      {shown.views.toLocaleString("en-US")} <span className="text-sm font-medium text-ink-2">{shown.views === 1 ? "view" : "views"}</span>
                    </p>
                    <p className="text-xs text-ink-3">{longDay(shown.day)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="relative ml-10 mt-2 h-5" aria-hidden="true">
            {labelled.map((i) => (
              <span
                key={series[i].day}
                className={cn("absolute whitespace-nowrap text-xs tabular-nums text-ink-3", i === 0 ? "" : i === count - 1 ? "-translate-x-full" : "-translate-x-1/2")}
                style={{ left: `${x(i)}%` }}
              >
                {shortDay(series[i].day)}
              </span>
            ))}
          </div>
        </div>
      )}
    </figure>
  );
}
