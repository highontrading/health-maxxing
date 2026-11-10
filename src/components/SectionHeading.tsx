import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";

/** Eyebrow, big heading and an optional "see all" link. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  href,
  cta,
  align = "left",
  className,
  as: As = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  href?: string;
  cta?: string;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("flex flex-col gap-5", align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between", className)}>
      <div className={cn(align === "center" && "flex flex-col items-center")}>
        {eyebrow && <p className="eyebrow mb-4 text-ink-3">{eyebrow}</p>}
        <As className={cn("display", As === "h1" ? "display-lg" : "display-md", "max-w-[20ch]")}>{title}</As>
        {lede && <p className={cn("lede mt-4 max-w-[58ch]", align === "center" && "mx-auto")}>{lede}</p>}
      </div>
      {href && (
        <Link href={href} className="btn btn-outline flex-none self-start md:self-auto">
          {cta ?? "See all"} <Icon name="arrow-right" size={16} />
        </Link>
      )}
    </div>
  );
}
