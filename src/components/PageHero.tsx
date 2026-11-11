import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs";
import { stagger } from "@/components/motion/stagger";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";

type Props = {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  color?: string;
  /** Up to three sticker ids shown as a loose cluster on wide screens. */
  stickers?: string[];
  crumbs?: Crumb[];
  children?: ReactNode;
  className?: string;
};

/** Coloured band that opens index and hub pages. The title and lede hold still; only the stickers pop in. */
export function PageHero({ eyebrow, title, lede, color = "sand", stickers = [], crumbs, children, className }: Props) {
  const spots = [
    { size: 150, rotate: -8, cls: "right-[14%] top-[10%]" },
    { size: 96, rotate: 12, cls: "right-[2%] top-[42%]" },
    { size: 84, rotate: -14, cls: "right-[30%] bottom-[6%]" },
  ];
  return (
    <header className={cn(`tone-${color}`, "relative overflow-hidden bg-tone-soft", className)}>
      <div className="container-hm relative pb-12 pt-8 md:pb-16 md:pt-12">
        {crumbs && <Breadcrumbs items={crumbs} className="mb-6 text-tone-ink" />}
        <div className="relative z-10 max-w-3xl">
          {eyebrow && <p className="eyebrow mb-4 text-tone-ink">{eyebrow}</p>}
          <h1 className="display display-lg text-ink">{title}</h1>
          {lede && <p className="mt-5 max-w-[56ch] text-[clamp(1.0625rem,1.5vw,1.25rem)] leading-[1.5] text-tone-ink">{lede}</p>}
          {children && <div className="mt-7">{children}</div>}
        </div>
        {stickers.length > 0 && (
          <div className="page-hero-stickers pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] lg:block" aria-hidden="true">
            {stickers.slice(0, 3).map((name, i) => (
              <Sticker key={name + i} name={name} size={spots[i].size} rotate={spots[i].rotate} className={cn("enter-pop absolute", spots[i].cls)} style={stagger(i)} />
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
