import { stagger } from "@/components/motion/stagger";
import { NewsletterForm } from "@/components/NewsletterForm";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";

/**
 * Inline newsletter call-to-action for the end of content pages. It rises in when the reader
 * scrolls down to it, and its two stickers pop in after it (`reveal`: see RevealObserver).
 */
export function NewsletterBand({ name, blurb, source, className }: { name: string; blurb: string; source: string; className?: string }) {
  return (
    <aside className={cn("reveal tone-lime relative overflow-hidden rounded-[28px] border-[1.5px] border-ink bg-tone-soft p-7 md:p-10", className)}>
      <div className="relative z-10 max-w-lg">
        <p className="eyebrow text-tone-ink">{name}</p>
        <p className="mt-3 text-[clamp(1.5rem,2.6vw,2.125rem)] font-medium leading-[1.08] tracking-[-0.03em]">
          Liked this? Get one like it <span className="serif-accent">every week.</span>
        </p>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">{blurb}</p>
        <NewsletterForm source={source} className="mt-5" />
      </div>
      {/* The sparkle near the top arrives first, the envelope at the bottom after it. */}
      <Sticker name="mail" size={120} rotate={10} className="reveal reveal-pop pointer-events-none absolute -bottom-3 right-6 hidden md:block" style={stagger(3)} />
      <Sticker name="sparkle" size={56} rotate={-12} className="reveal reveal-pop pointer-events-none absolute right-[150px] top-8 hidden md:block" style={stagger(2)} />
    </aside>
  );
}
