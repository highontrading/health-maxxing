"use client";

import { createContext, useContext, useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type AnimationEvent, type ReactNode } from "react";
import { Collapse } from "@/components/motion/Collapse";
import { usePresence } from "@/components/motion/presence";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/hooks";
import { fmt } from "./format";

/*
 * Motion for the calculators (styles: src/app/styles/motion/tools.css).
 * - What is on the page when it opens stays still.
 * - The first result the visitor's input brings in pops in and counts up.
 *   After that a result that goes and comes back while a number is being
 *   retyped is simply there again: typing must feel instant.
 * - A result that stays on screen is alive: its numbers count to new values,
 *   and what joins it later (a new verdict, extra tiles) plays its entrance.
 * - An entrance plays once: its mark is removed when it ends, so it cannot
 *   play again when a hidden page is shown again (browser back).
 * - The real value is always in the page. Counting is painted on top of it.
 */

type CalculatorState = {
  /** How many changes the visitor has made to the inputs. Zero means untouched. */
  changes: number;
  /** A result has already played its entrance in this calculator. */
  resultShown: boolean;
  markResultShown: () => void;
};
const CalculatorContext = createContext<CalculatorState>({ changes: 0, resultShown: false, markResultShown: () => {} });

/** What a result tells the things inside it. Null outside a result. */
type ResultState = {
  /** The result arrived with an entrance (it was the first). */
  entered: boolean;
  /** The result was already on screen before the latest change. */
  live: boolean;
};
export const ResultMotion = createContext<ResultState | null>(null);

/** Wraps one calculator and counts the changes the visitor makes in it. */
export function CalculatorMotion({ children, className }: { children: ReactNode; className?: string }) {
  const [changes, setChanges] = useState(0);
  const [resultShown, setResultShown] = useState(false);
  return (
    <div className={className} onChangeCapture={() => setChanges((n) => n + 1)}>
      <CalculatorContext value={{ changes, resultShown, markResultShown: () => setResultShown(true) }}>{children}</CalculatorContext>
    </div>
  );
}

type EntranceProps = { "data-enter": "true" | undefined; onAnimationEnd: (event: AnimationEvent<HTMLElement>) => void };

/** `data-enter` until the element's own animation has ended. Style it with a one-shot animation. */
function useMark(enter: boolean, onEnd?: () => void): EntranceProps {
  const [entering, setEntering] = useState(enter);
  return {
    "data-enter": entering ? "true" : undefined,
    onAnimationEnd: (event) => {
      if (event.target !== event.currentTarget) return;
      setEntering(false);
      onEnd?.();
    },
  };
}

/**
 * For the result panel: the props that play its entrance, and the state to
 * hand to its content through <ResultMotion>. Only the first result after the
 * visitor's own input enters; one that was in the page from the start, or
 * that returns after a half-typed number, does not.
 */
export function useResultEntrance(): { entrance: EntranceProps; state: ResultState } {
  const { changes, resultShown, markResultShown } = useContext(CalculatorContext);
  const [bornAt] = useState(changes);
  const [entered] = useState(changes > 0 && !resultShown);
  const entrance = useMark(entered, markResultShown);
  return { entrance, state: { entered, live: changes !== bornAt } };
}

/** True for something that arrives with an entering result, or joins a result already on screen. */
function useArrival(): boolean {
  const result = useContext(ResultMotion);
  const [arrives] = useState(result !== null && (result.entered || result.live));
  return arrives;
}

/** For something inside a result (a tile, the verdict, a marker): the props that play its entrance once. */
export function useEntrance(): EntranceProps {
  return useMark(useArrival());
}

let countMs: number | null = null;
/** How long a count lasts: the --dur-slow token, read once so CSS and JavaScript stay in step. */
function countDuration(): number {
  if (countMs === null) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--dur-slow").trim();
    const amount = parseFloat(raw);
    countMs = Number.isFinite(amount) ? (raw.endsWith("ms") ? amount : amount * 1000) : 320;
  }
  return countMs;
}

type LiveNumberProps = {
  value: number;
  /** Decimal places, with thousands grouped. Ignored when `format` is given. */
  decimals?: number;
  /** Custom text for a value, such as a duration. */
  format?: (value: number) => string;
  /** Changes when the same quantity is shown in another unit: the number then swaps at once. */
  snapKey?: string;
  className?: string;
};

/**
 * A result number that counts to its new value when an input changes, and up
 * from zero when it arrives (with the first result, or in a tile that joins a
 * result later). Use it inside <Result>.
 *
 * The exact value is the element's only text at all times, so screen readers,
 * copy and tests never see a number in between. While counting, that text is
 * painted transparent and the running figure is drawn over it from a
 * `data-shown` attribute (generated content of an aria-hidden span). The box
 * is always as wide as the wider of the two, so nothing beside it is pushed
 * or overlapped. The layout is in tools.css under "Live numbers".
 */
export function LiveNumber({ value, decimals = 0, format, snapKey, className }: LiveNumberProps) {
  const text = format ? format(value) : fmt(value, decimals);
  const fromZero = useArrival();
  const reduced = useReducedMotion();
  const root = useRef<HTMLSpanElement>(null);
  const ticker = useRef<HTMLSpanElement>(null);
  /** What the visitor last saw: the value (mid-count, a figure in between) and its unit. */
  const shown = useRef<{ value: number; snapKey: string | undefined } | null>(null);
  const toText = useEffectEvent((v: number) => (format ? format(v) : fmt(v, decimals)));

  // A layout effect, so the first frame already shows the starting figure, not the final one.
  useLayoutEffect(() => {
    const wrap = root.current;
    const tick = ticker.current;
    if (!wrap || !tick) return;
    const last = shown.current;
    const from = last ? last.value : fromZero ? 0 : value;
    const still = reduced || !Number.isFinite(value) || (last !== null && last.snapKey !== snapKey) || toText(from) === text;
    shown.current = { value: still ? value : from, snapKey };
    if (still) return;

    const duration = countDuration();
    // The clock starts with the first frame and only frame times are compared: they can run
    // behind performance.now(), which would make the count start by going the wrong way.
    let started: number | null = null;
    let frame = 0;
    const clear = () => {
      delete wrap.dataset.counting;
      delete tick.dataset.shown;
    };
    const step = (now: number) => {
      started ??= now;
      const progress = Math.min(1, Math.max(0, (now - started) / duration));
      if (progress >= 1) {
        shown.current = { value, snapKey };
        clear();
        return;
      }
      // The same ease-out as CountUp: quick at first, slow into the final value.
      const current = from + (value - from) * (1 - (1 - progress) ** 3);
      shown.current = { value: current, snapKey };
      tick.dataset.shown = toText(current);
      frame = requestAnimationFrame(step);
    };
    wrap.dataset.counting = "true";
    tick.dataset.shown = toText(from);
    frame = requestAnimationFrame(step);
    // A new value mid-count starts again from the figure on screen (kept in `shown`).
    return () => {
      cancelAnimationFrame(frame);
      clear();
    };
  }, [value, text, snapKey, reduced, fromZero]);

  return (
    <span ref={root} className={cn("tool-num", className)}>
      <span ref={ticker} className="tool-num-ticker" aria-hidden="true" />
      <span className="tool-num-value">{text}</span>
    </span>
  );
}

/** A little longer than the collapse transition (--dur-slow), so the field leaves only after it has closed. */
const CLOSE_MS = 340;

/**
 * A field that exists only for some choices. It slides open when it appears
 * and closed before it is removed, so the fields below glide instead of
 * jumping. At rest nothing changes: the field is either fully there or not in
 * the page at all.
 */
export function OptionalField({ show, children, className }: { show: boolean; children: ReactNode; className?: string }) {
  const { mounted } = usePresence(show, CLOSE_MS);
  // Added closed, then opened on the next frame: the height needs a start to animate from.
  const [open, setOpen] = useState(show);
  if (!show && open) setOpen(false);
  useEffect(() => {
    if (!show || open) return;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [show, open]);
  if (!mounted) return null;
  return (
    <Collapse open={show && open} className={className}>
      {children}
    </Collapse>
  );
}
