import { NewsletterForm } from "@/components/NewsletterForm";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";

/** Inline newsletter call-to-action for the end of content pages. */
export function NewsletterBand({ name, blurb, source, className }: { name: string; blurb: string; source: string; className?: string }) {
  return (
    <aside className={cn("tone-lime relative overflow-hidden rounded-[28px] border-[1.5px] border-ink bg-tone-soft p-7 md:p-10", className)}>
      <div className="relative z-10 max-w-lg">
        <p className="eyebrow text-tone-ink">{name}</p>
        <p className="mt-3 text-[clamp(1.5rem,2.6vw,2.125rem)] font-medium leading-[1.08] tracking-[-0.03em]">
          Liked this? Get one like it <span className="serif-accent">every week.</span>
        </p>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">{blurb}</p>
        <NewsletterForm source={source} className="mt-5" />
      </div>
      <Sticker name="mail" size={120} rotate={10} className="pointer-events-none absolute -bottom-3 right-6 hidden md:block" />
      <Sticker name="sparkle" size={56} rotate={-12} className="pointer-events-none absolute right-[150px] top-8 hidden md:block" />
    </aside>
  );
}
