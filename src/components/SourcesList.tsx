import type { Source } from "@/lib/types";
import { Icon } from "@/components/Icon";

/**
 * Numbered reference list. Items carry `source-n` ids that citations link to;
 * the one a citation jumps to flashes, then keeps a soft tint (`.source-item`
 * in styles/motion/reading.css).
 */
export function SourcesList({ sources, heading = "Sources" }: { sources: Source[]; heading?: string }) {
  if (!sources.length) return null;
  return (
    <section aria-labelledby="sources-heading" className="mt-14">
      <h2 id="sources-heading" className="text-[1.5rem] font-medium tracking-[-0.025em]">
        {heading}
      </h2>
      <p className="mt-2 text-sm text-ink-3">Every claim above links to one of these. We favour guidelines, systematic reviews and major trials.</p>
      <ol className="mt-5 space-y-2">
        {sources.map((s, i) => (
          <li key={s.url + i} id={`source-${i + 1}`} className="source-item flex scroll-mt-28 gap-3 rounded-2xl p-3 text-[0.9375rem] leading-snug target:bg-tone-soft">
            <span className="flex size-7 flex-none items-center justify-center rounded-full bg-tone-soft text-xs font-bold text-tone-ink tabular-nums">{i + 1}</span>
            <span className="min-w-0">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="source-link font-medium underline decoration-line-strong underline-offset-[3px] hover:decoration-ink">
                {s.title}
                <Icon name="external" size={13} className="ml-1 inline align-[-1px] opacity-60" />
              </a>
              <span className="mt-0.5 block text-ink-3">
                {s.publisher}
                {s.year ? `, ${s.year}` : ""}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
