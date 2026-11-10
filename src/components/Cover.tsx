import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { hash } from "@/lib/format";

const ACCENTS = ["sparkle", "star", "plus", "check", "bolt", "heart", "leaf", "drop"];

type Props = {
  /** Used to pick a stable decorative variant. */
  seed: string;
  sticker: string;
  color: string;
  /** Optional photo. When set it replaces the sticker art. */
  image?: string;
  alt?: string;
  /** Scale of the main sticker relative to the frame width. */
  scale?: number;
  className?: string;
  priority?: boolean;
};

/**
 * Sticker-art cover. Each article gets a tone, a hero sticker and a backdrop
 * chosen from its slug, so covers are varied but stable between renders.
 */
export function Cover({ seed, sticker, color, image, alt = "", scale = 0.46, className }: Props) {
  const h = hash(seed);
  const variant = h % 5;
  const tilt = ((h >> 3) % 21) - 10;
  const accentA = ACCENTS[(h >> 5) % ACCENTS.length];
  const accentB = ACCENTS[(h >> 8) % ACCENTS.length];
  const flip = (h >> 11) % 2 === 0;

  if (image) {
    return (
      <div className={cn(`tone-${color}`, "relative isolate overflow-hidden bg-tone-soft", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={alt} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
        <Sticker name={sticker} size="22%" rotate={tilt} className="absolute bottom-[6%] right-[5%]" style={{ height: "auto", aspectRatio: "1 / 1" }} />
      </div>
    );
  }

  return (
    <div className={cn(`tone-${color}`, "relative isolate overflow-hidden bg-tone-soft", className)} aria-hidden="true">
      {variant === 0 && <span className="absolute -bottom-[30%] -right-[18%] aspect-square w-[78%] rounded-full bg-tone-solid opacity-30" />}
      {variant === 1 && (
        <>
          <span className="absolute -left-[22%] -top-[34%] aspect-square w-[84%] rounded-full border-[14px] border-tone-solid opacity-25" />
          <span className="absolute -left-[8%] -top-[14%] aspect-square w-[52%] rounded-full border-[14px] border-tone-solid opacity-25" />
        </>
      )}
      {variant === 2 && (
        <span
          className="absolute inset-0 opacity-25"
          style={{ backgroundImage: "repeating-linear-gradient(-38deg, var(--tone-solid) 0 14px, transparent 14px 44px)" }}
        />
      )}
      {variant === 3 && (
        <span
          className="absolute inset-0 opacity-40"
          style={{ backgroundImage: "radial-gradient(var(--tone-solid) 2.2px, transparent 2.6px)", backgroundSize: "22px 22px" }}
        />
      )}
      {variant === 4 && (
        <>
          <span className="absolute -left-[10%] bottom-[-46%] aspect-square w-[70%] rotate-12 rounded-[28%] bg-tone-solid opacity-25" />
          <span className="absolute -right-[12%] -top-[40%] aspect-square w-[58%] -rotate-12 rounded-[28%] bg-tone-solid opacity-20" />
        </>
      )}
      <Sticker
        name={accentA}
        size="13%"
        rotate={flip ? -18 : 16}
        className={cn("absolute", flip ? "left-[9%] top-[12%]" : "right-[9%] top-[13%]")}
        style={{ height: "auto", aspectRatio: "1 / 1" }}
      />
      <Sticker
        name={accentB === accentA ? "sparkle" : accentB}
        size="10%"
        rotate={flip ? 14 : -12}
        className={cn("absolute", flip ? "bottom-[13%] right-[11%]" : "bottom-[14%] left-[10%]")}
        style={{ height: "auto", aspectRatio: "1 / 1" }}
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <Sticker
          name={sticker}
          size={`${Math.round(scale * 100)}%`}
          rotate={tilt}
          className="cover-hero transition-transform duration-300 ease-out"
          style={{ height: "auto", aspectRatio: "1 / 1" }}
        />
      </span>
    </div>
  );
}
