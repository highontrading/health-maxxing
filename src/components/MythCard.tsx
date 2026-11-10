"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { VERDICT } from "@/lib/labels";
import type { Myth } from "@/lib/types";

/** A claim you tap to reveal the verdict. `detailed` also shows the explanation and sources. */
export function MythCard({ myth, detailed = false, className }: { myth: Myth; detailed?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const v = VERDICT[myth.verdict] ?? VERDICT.false;

  return (
    <div
      id={myth.slug}
      className={cn(
        open ? `tone-${v.tone}` : "tone-sand",
        "relative flex min-h-[230px] scroll-mt-28 flex-col rounded-[26px] border-[1.5px] border-ink p-5 transition-colors duration-300",
        open ? "bg-tone-soft" : "bg-paper",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={cn("pixel-tag", open && "bg-tone-ink")}>{open ? v.label : "Myth or fact?"}</span>
        <Sticker key={open ? "v" : "q"} name={open ? v.sticker : myth.sticker} size={44} rotate={open ? 8 : -8} style={{ animation: "pop 0.35s cubic-bezier(0.2,1.4,0.4,1) both" }} />
      </div>
      <p className="mt-4 text-[1.3125rem] font-medium leading-[1.2] tracking-[-0.02em] text-balance">“{myth.myth}”</p>
      {open && (
        <div className="mt-3 space-y-2 text-[0.9375rem] leading-relaxed" style={{ animation: "rise 0.3s ease both" }}>
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
      )}
      <button
        type="button"
        className="mt-auto inline-flex items-center gap-1.5 self-start pt-4 text-sm font-semibold underline-offset-4 hover:underline"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Hide the answer" : "Reveal the answer"}
        <Icon name={open ? "minus" : "plus"} size={16} />
      </button>
    </div>
  );
}
