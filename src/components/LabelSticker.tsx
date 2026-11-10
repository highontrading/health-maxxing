import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  variant?: "pill" | "oval" | "tag" | "lime";
  /** Small line above the text on the "tag" variant. */
  kicker?: string;
  rotate?: number;
  className?: string;
  style?: CSSProperties;
};

/** A text sticker: pill, oval badge or "hello, I'm" name tag. Decorative. */
export function LabelSticker({ children, variant = "pill", kicker = "Hello, I'm", rotate = 0, className, style }: Props) {
  const base = { ["--r" as string]: `${rotate}deg`, ...style };
  if (variant === "tag") {
    return (
      <span
        aria-hidden="true"
        className={cn("inline-block overflow-hidden rounded-[14px] bg-white text-center outline outline-4 outline-white", className)}
        style={{ rotate: "var(--r)", filter: "var(--shadow-sticker)", border: "2px solid var(--ink)", ...base }}
      >
        <span className="block bg-[var(--pink-solid)] px-4 py-1 font-sans text-[0.625em] font-extrabold uppercase tracking-[0.12em] text-white">{kicker}</span>
        <span className="serif-accent block px-4 pb-1.5 pt-1 text-[1.5em] leading-none">{children}</span>
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "label-sticker",
        variant === "oval" && "serif-accent rounded-[50%] border-[var(--blue-solid)] bg-[var(--blue-solid)] px-[1.3em] py-[0.7em] text-[1.15em] text-white",
        variant === "lime" && "border-ink bg-[var(--lime-solid)] font-pixel uppercase tracking-[0.06em]",
        className,
      )}
      style={base}
    >
      {children}
    </span>
  );
}
