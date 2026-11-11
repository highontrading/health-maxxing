"use client";

import { useState } from "react";
import { Collapse } from "@/components/motion/Collapse";
import { usePresence } from "@/components/motion/presence";
import { stagger } from "@/components/motion/stagger";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/hooks";
import { VERDICT } from "@/lib/labels";
import type { Myth } from "@/lib/types";

/** How long a closing answer stays in the page: a little over its --dur-base close (`.myth-answer` in reading.css). */
const CLOSE_MS = 220;

/** A claim you tap to reveal the verdict. `detailed` also shows the explanation and sources. */
export function MythCard({ myth, detailed = false, className }: { myth: Myth; detailed?: boolean; className?: string }) {
  // Null until the first click: the sticker and the tag only move in answer to one, never on load.
  const [shown, setShown] = useState<boolean | null>(null);
  const open = shown === true;
  const touched = shown !== null;
  const reduced = useReducedMotion();
  // The answer is in the page only while open, plus the moment it takes to close.
  const answer = usePresence(open, reduced ? 0 : CLOSE_MS);
  const v = VERDICT[myth.verdict] ?? VERDICT.false;

  return (
    <div
      id={myth.slug}
      className={cn(
        open ? `tone-${v.tone}` : "tone-sand",
        "relative flex min-h-[230px] scroll-mt-28 flex-col rounded-[26px] border-[1.5px] border-ink p-5 transition-colors duration-(--dur-base)",
        open ? "bg-tone-soft" : "bg-paper",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={cn("pixel-tag transition-colors duration-(--dur-base)", open && "bg-tone-ink")}>
          <span key={open ? "v" : "q"} className={touched ? "reading-swap-in" : undefined}>
            {open ? v.label : "Myth or fact?"}
          </span>
        </span>
        {/* stagger(0): a pop that answers a click must not wait for a position inherited from a list around the card. */}
        <Sticker key={open ? "v" : "q"} name={open ? v.sticker : myth.sticker} size={44} rotate={open ? 8 : -8} className={touched ? "enter-pop" : undefined} style={stagger(0)} />
      </div>
      <p className="mt-4 text-[1.3125rem] font-medium leading-[1.2] tracking-[-0.02em] text-balance">“{myth.myth}”</p>
      {answer.mounted && (
        // Wider than the text by the negative margin, so the collapse does not clip the focus ring of a source link.
        <Collapse open={answer.state === "open"} className="myth-answer -mx-2">
          <div className="enter-fade space-y-2 px-2 pb-1 pt-3 text-[0.9375rem] leading-relaxed" style={stagger(0)}>
            <p className="font-semibold">{myth.answer}</p>
            {detailed && <p className="opacity-90">{myth.explanation}</p>}
            {detailed && myth.sources.length > 0 && (
              <p className="text-[0.8125rem] opacity-80">
                Source{myth.sources.length > 1 ? "s" : ""}:{" "}
                {myth.sources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 && "; "}
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:no-underline">
                      {s.publisher}
                      {s.year ? ` (${s.year})` : ""}
                    </a>
                  </span>
                ))}
              </p>
            )}
          </div>
        </Collapse>
      )}
      <button
        type="button"
        className="mt-auto inline-flex items-center gap-1.5 self-start pt-4 text-sm font-semibold underline-offset-4 hover:underline"
        aria-expanded={open}
        onClick={() => setShown(!open)}
      >
        {open ? "Hide the answer" : "Reveal the answer"}
        {/* The same plus and minus as <Icon>, drawn as two bars so one can turn (reading.css). */}
        <svg
          className="myth-toggle-icon"
          data-open={open ? "true" : "false"}
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <line x1="12" y1="5" x2="12" y2="19" />
        </svg>
      </button>
    </div>
  );
}
