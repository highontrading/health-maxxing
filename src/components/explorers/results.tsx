"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";

/**
 * Shared pieces of the explorers' result areas: how a list arrives after a
 * filter change, the count line and the empty panel. The classes are in
 * `src/app/styles/motion/explore.css`.
 *
 * Every entrance class here comes off again once it has played. A page the
 * visitor returns to with Back is shown again, not rebuilt, and a class that
 * is still on it would play a second time.
 */

/** Rows after this many simply appear: they are below even a tall screen, so animating them would be wasted work. */
const WAVE_ROWS = 24;
/** The cascade has this many steps; every later row arrives with the last one. */
const WAVE_STEPS = 6;
/** How long the entrance classes stay on at least: a little longer than the cascade takes with today's tokens. */
const WAVE_MS = 500;

type Wave = { id: number; from: number; on: boolean; touched: boolean };

/**
 * How a result list arrives after the visitor changes it.
 *
 * - `replay()`: a chip, select, sort or "Clear filters" changed the results, so they enter again as a quick cascade.
 * - `extend(from)`: "Show more" added rows, and only the rows from that index enter.
 * - `still()`: the visitor is typing, so results swap at once. Nothing animates per keystroke.
 *
 * Nothing moves until one of these is called, so a list that is in the
 * server-rendered page never fades in on load.
 */
export function useResultWave() {
  const [wave, setWave] = useState<Wave>({ id: 0, from: 0, on: false, touched: false });
  useEffect(() => {
    if (!wave.on) return;
    let timer = 0;
    const settle = () => {
      // Still playing (longer tokens one day, or animations slowed down in the dev tools): look again shortly.
      const playing = document.getAnimations?.().some((a) => a.playState === "running" && a instanceof CSSAnimation && a.animationName.startsWith("explore-"));
      if (playing) timer = window.setTimeout(settle, 100);
      else setWave((w) => ({ ...w, on: false }));
    };
    timer = window.setTimeout(settle, WAVE_MS);
    return () => window.clearTimeout(timer);
  }, [wave.on, wave.id, wave.from]);
  // Two names for one animation: changing the name replays it on rows that stay. Rebuilding the list with a new
  // key would also work, but it would close every opened myth card and pop every sticker again.
  const name = wave.id % 2 ? "b" : "a";
  return {
    replay: () => setWave((w) => ({ id: w.id + 1, from: 0, on: true, touched: true })),
    extend: (from: number) => setWave((w) => ({ ...w, from, on: true, touched: true })),
    still: () => setWave((w) => (w.on || !w.touched ? { ...w, on: false, touched: true } : w)),
    /** True for a moment after a control changed the results; false at rest and while the visitor types. */
    on: wave.on,
    /** True once the visitor has changed anything. */
    touched: wave.touched,
    /** Spread onto each card or row: `<li key={slug} {...wave.row(i)}>`. */
    row(index: number): { className?: string; style?: CSSProperties } {
      const step = index - wave.from;
      if (!wave.on || step < 0 || step >= WAVE_ROWS) return {};
      // Not `--i`: that one is inherited, so it would also delay anything inside the card that staggers itself.
      return { className: `result-enter-${name}`, style: { "--wave-step": Math.min(step, WAVE_STEPS) } as CSSProperties };
    },
    /** For a long list or a table body, which fades as one piece instead of row by row. */
    region: wave.on ? `results-fade-${name}` : undefined,
  };
}

/**
 * The "12 articles" line under the filters. It stays one live region. When a
 * control changes the text it swaps with a short fade (`fade`); while the
 * visitor types it simply updates.
 */
export function ResultCount({ text, fade }: { text: string; fade: boolean }) {
  // `swaps` counts the changes that fade: each one rebuilds the span, which is what plays the animation.
  // `fresh` is true until that animation has ended. The span in the server-rendered page has neither.
  const [shown, setShown] = useState({ text, swaps: 0, fresh: false });
  if (shown.text !== text) setShown({ text, swaps: fade ? shown.swaps + 1 : shown.swaps, fresh: fade });
  return (
    <p className="mt-6 text-sm text-ink-3" aria-live="polite">
      <span key={shown.swaps} className={shown.fresh ? "result-count-swap" : undefined} onAnimationEnd={() => setShown((s) => ({ ...s, fresh: false }))}>
        {text}
      </span>
    </p>
  );
}

/**
 * The panel shown when a filter leaves nothing: it rises in and its sticker
 * pops. Pass `enter` as false when the visitor has not changed anything yet
 * (an empty library, or a link that opens on an empty filter), so nothing
 * moves on load.
 */
export function EmptyState({ sticker, enter, children }: { sticker: string; enter: boolean; children: ReactNode }) {
  // Decided when the panel appears: a panel that is already on the page must not start moving later.
  const [entering, setEntering] = useState(enter);
  return (
    <div
      className={cn("mt-8 flex flex-col items-center rounded-[26px] bg-sand px-6 py-16 text-center", entering && "empty-state-enter")}
      onAnimationEnd={(event) => {
        // The sticker finishes last. Its event bubbles up to here.
        if (event.target !== event.currentTarget) setEntering(false);
      }}
    >
      <Sticker name={sticker} size={84} rotate={-8} className={entering ? "enter-pop" : undefined} />
      {children}
    </div>
  );
}
