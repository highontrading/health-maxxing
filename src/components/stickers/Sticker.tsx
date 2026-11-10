import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { STICKER_ART } from "./art";

type Props = {
  /** A sticker id from content/stickers.json. Unknown ids fall back to the heart. */
  name: string;
  /** Rendered width and height in px (or any CSS length as a string). */
  size?: number | string;
  /** Rotation in degrees. */
  rotate?: number;
  /** Accessible label. Omit for decorative stickers. */
  label?: string;
  /** Drop the shadow (for dense lists and small sizes). */
  flat?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * A die-cut sticker. The artwork is rendered twice: once as a fat white
 * silhouette (the cut line), once on top in colour.
 */
export function Sticker({ name, size = 96, rotate = 0, label, flat, className, style }: Props) {
  const art = STICKER_ART[name] ?? STICKER_ART.heart;
  const dim = typeof size === "number" ? `${size}px` : size;
  return (
    <span
      className={cn("sticker", flat && "sticker-flat", className)}
      style={{ width: dim, height: dim, ["--r" as string]: `${rotate}deg`, ...style }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" focusable="false">
        <g className="sticker-cut">{art()}</g>
        <g>{art()}</g>
      </svg>
    </span>
  );
}
