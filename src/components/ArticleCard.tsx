import Link from "next/link";
import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { KIND_LABEL } from "@/lib/format";
import type { ArticleCard as Card } from "@/lib/types";

type CategoryLite = { slug: string; name: string; color: string };

function Meta({ article, category, className }: { article: Card; category?: CategoryLite; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] font-medium text-ink-3", className)}>
      {category && <span className="font-semibold text-tone-ink">{category.name}</span>}
      {category && <span aria-hidden="true">·</span>}
      <span>{KIND_LABEL[article.kind] ?? "Article"}</span>
      <span aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1">
        <Icon name="clock" size={13} />
        {article.readingMinutes} min
      </span>
    </p>
  );
}

/** Standard grid card: cover on top, text below. */
export function ArticleCard({ article, category, className, headingLevel = 3 }: { article: Card; category?: CategoryLite; className?: string; headingLevel?: 2 | 3 | 4 }) {
  const H = `h${headingLevel}` as "h2";
  const color = category?.color ?? "sand";
  return (
    <article className={cn(`tone-${color}`, "group relative flex flex-col", className)}>
      <Cover
        seed={article.slug}
        sticker={article.sticker}
        color={color}
        image={article.coverImage}
        className="aspect-[4/3] rounded-[22px] transition-transform duration-300 group-hover:-translate-y-1 [&_.cover-hero]:group-hover:scale-110"
      />
      <div className="flex flex-1 flex-col px-1 pt-4">
        <Meta article={article} category={category} />
        <H className="mt-2 text-[1.3125rem] font-semibold leading-[1.15] tracking-[-0.02em] text-balance">
          <Link href={`/articles/${article.slug}`} className="after:absolute after:inset-0 after:rounded-[22px] group-hover:underline group-hover:decoration-tone-solid group-hover:decoration-[3px] group-hover:underline-offset-4">
            {article.title}
          </Link>
        </H>
        <p className="mt-2 line-clamp-2 text-[0.9375rem] leading-relaxed text-ink-2">{article.summary || article.dek}</p>
      </div>
    </article>
  );
}

/** Compact row for lists and sidebars. */
export function ArticleRow({ article, category, className }: { article: Card; category?: CategoryLite; className?: string }) {
  const color = category?.color ?? "sand";
  return (
    <article className={cn(`tone-${color}`, "group relative flex items-center gap-4 rounded-[20px] p-2.5 transition-colors hover:bg-sand", className)}>
      <span className="flex size-[72px] flex-none items-center justify-center rounded-2xl bg-tone-soft">
        <Sticker name={article.sticker} size={48} flat className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
      </span>
      <div className="min-w-0">
        <Meta article={article} category={category} />
        <h3 className="mt-1 text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em]">
          <Link href={`/articles/${article.slug}`} className="after:absolute after:inset-0 after:rounded-[20px]">
            {article.title}
          </Link>
        </h3>
      </div>
    </article>
  );
}

/**
 * Bento block: a tone-coloured card with the sticker tucked in a corner.
 * `solid` uses the saturated tone as the background.
 */
export function ArticleBento({
  article,
  category,
  size = "md",
  solid = false,
  className,
}: {
  article: Card;
  category?: CategoryLite;
  size?: "lg" | "md" | "sm";
  solid?: boolean;
  className?: string;
}) {
  const color = category?.color ?? "sand";
  // Saturated tones that are dark enough to carry white text.
  const lightText = solid && ["blue", "indigo", "pink", "plum"].includes(color);
  return (
    <article
      className={cn(
        `tone-${color}`,
        "group relative isolate flex min-h-[220px] flex-col overflow-hidden rounded-[26px] p-6 transition-transform duration-300 hover:-translate-y-1 md:p-7",
        solid ? "bento-solid" : "bg-tone-soft text-tone-ink",
        lightText && "text-white",
        size === "lg" && "min-h-[420px] md:p-9",
        className,
      )}
      style={solid ? { background: color === "pink" ? "#d92d59" : "var(--tone-solid)" } : undefined}
    >
      <p className={cn("flex items-center gap-2 text-[0.8125rem] font-semibold", solid ? (lightText ? "text-white/85" : "text-ink/75") : "")}>
        <span className={cn("pixel-tag", solid && !lightText ? "bg-ink text-paper" : solid ? "bg-white text-ink" : "bg-tone-ink text-white")}>
          {KIND_LABEL[article.kind] ?? "Article"}
        </span>
        {category?.name}
        <span aria-hidden="true">·</span>
        {article.readingMinutes} min
      </p>
      <h3
        className={cn(
          "mt-4 max-w-[18ch] font-medium tracking-[-0.03em] text-balance",
          size === "lg" ? "text-[clamp(2rem,3.4vw,3.25rem)] leading-[1.02]" : size === "md" ? "text-[clamp(1.5rem,2.2vw,2rem)] leading-[1.06]" : "text-[1.375rem] leading-[1.1]",
          solid && !lightText && "text-ink",
        )}
      >
        <Link href={`/articles/${article.slug}`} className="after:absolute after:inset-0">
          {article.title}
        </Link>
      </h3>
      {size !== "sm" && (
        <p className={cn("mt-3 max-w-[44ch] text-[0.9375rem] leading-relaxed", solid ? (lightText ? "text-white/90" : "text-ink/80") : "opacity-85", size === "lg" && "text-base md:text-lg")}>
          {article.dek}
        </p>
      )}
      {/* Medium cards leave room above the link so the corner sticker never sits on the summary. */}
      <span className={cn("mt-auto inline-flex items-center gap-1.5 text-sm font-semibold", size === "md" ? "pt-12" : "pt-6", solid && !lightText && "text-ink")}>
        Read it <Icon name="arrow-right" size={16} className="transition-transform group-hover:translate-x-1" />
      </span>
      {size === "lg" && <span className="pointer-events-none absolute -bottom-[34%] -right-[16%] -z-10 aspect-square w-[62%] rounded-full bg-tone-solid opacity-25" aria-hidden="true" />}
      <Sticker
        name={article.sticker}
        size={size === "lg" ? 250 : size === "md" ? 112 : 96}
        rotate={size === "lg" ? -8 : 10}
        className={cn(
          "pointer-events-none absolute -z-0 transition-transform duration-300 group-hover:scale-110",
          size === "lg" ? "-bottom-5 right-2 max-md:size-36!" : "-bottom-4 -right-3",
        )}
      />
    </article>
  );
}
