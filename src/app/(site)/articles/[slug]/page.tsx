import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import { ReadingProgress, SaveButton, ShareButton, Toc, ViewTracker } from "@/components/article/ArticleClient";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Cover } from "@/components/Cover";
import { FaqList } from "@/components/FaqList";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { NewsletterBand } from "@/components/NewsletterBand";
import { Prose } from "@/components/Prose";
import { SourcesList } from "@/components/SourcesList";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { getArticle, getArticleSlugs, getCategories, getRelatedArticles, getSettings } from "@/lib/data";
import { formatMonthYear, KIND_LABEL } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { PageTransition } from "@/components/motion/PageTransition";

type Props = PageProps<"/articles/[slug]">;

export async function generateStaticParams() {
  const slugs = await getArticleSlugs();
  return (slugs.length ? slugs : ["__placeholder__"]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Article not found", robots: { index: false } };
  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.summary || article.dek;
  return {
    title,
    description,
    alternates: { canonical: `/articles/${article.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/articles/${article.slug}`,
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt,
      tags: article.tags,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function ArticlePage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <PageTransition variant="skeleton">
          <ArticleSkeleton />
        </PageTransition>
      }
    >
      <PageTransition>
        <ArticleView params={params} />
      </PageTransition>
    </Suspense>
  );
}

function ArticleSkeleton() {
  return (
    <main className="bg-sand" aria-busy="true">
      <div className="container-hm py-14 md:py-20">
        <div className="h-4 w-40 rounded-full bg-sand-3" />
        <div className="mt-8 h-14 max-w-2xl rounded-2xl bg-sand-3" />
        <div className="mt-4 h-14 max-w-xl rounded-2xl bg-sand-3" />
        <div className="mt-8 h-5 max-w-lg rounded-full bg-sand-2" />
      </div>
    </main>
  );
}

async function ArticleView({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const [categories, related, settings] = await Promise.all([getCategories(), getRelatedArticles(slug, 3), getSettings()]);
  const cat = new Map(categories.map((c) => [c.slug, c]));
  const category = cat.get(article.category);
  const color = category?.color ?? "sand";
  const { html, toc } = renderMarkdown(article.body, { citations: article.sources.length });
  const h2 = toc.filter((t) => t.level === 2);
  const updated = formatMonthYear(article.reviewedAt ?? article.updatedAt);
  const url = absoluteUrl(`/articles/${article.slug}`);

  return (
    <main className={`tone-${color}`}>
      <ReadingProgress />
      <ViewTracker kind="article" slug={article.slug} />
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: article.summary || article.dek,
            datePublished: article.publishedAt,
            dateModified: article.updatedAt,
            author: { "@type": "Organization", name: article.author || SITE_NAME, url: absoluteUrl("/about") },
            publisher: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
            mainEntityOfPage: url,
            articleSection: category?.name,
            keywords: article.tags.join(", "),
            wordCount: article.wordCount,
            citation: article.sources.map((s) => s.url),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
              ...(category ? [{ "@type": "ListItem", position: 2, name: category.name, item: absoluteUrl(`/topics/${category.slug}`) }] : []),
              { "@type": "ListItem", position: category ? 3 : 2, name: article.title, item: url },
            ],
          },
          ...(article.faqs.length
            ? [
                {
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: article.faqs.map((f) => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: f.a },
                  })),
                },
              ]
            : []),
        ]}
      />

      {/* Header */}
      <header className="bg-tone-soft">
        <div className="container-hm grid gap-10 pb-12 pt-8 md:pb-16 md:pt-12 lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:gap-14">
          <div>
            <Breadcrumbs
              className="text-tone-ink"
              items={[{ href: "/", label: "Home" }, ...(category ? [{ href: `/topics/${category.slug}`, label: category.name }] : []), { label: KIND_LABEL[article.kind] ?? "Article" }]}
            />
            <h1 className="display mt-6 text-[clamp(2.25rem,5vw,4rem)] text-ink">{article.title}</h1>
            <p className="mt-5 max-w-[52ch] text-[clamp(1.0625rem,1.6vw,1.3125rem)] leading-[1.5] text-tone-ink">{article.dek}</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium text-tone-ink">
              <span className="inline-flex items-center gap-2">
                <Sticker name="heart" size={26} flat />
                {article.author || "Health Maxxing Editors"}
              </span>
              {updated && <span>Updated {updated}</span>}
              <span className="inline-flex items-center gap-1.5">
                <Icon name="clock" size={15} />
                {article.readingMinutes} min read
              </span>
              {article.factCheck === "verified" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 text-ink">
                  <Icon name="check" size={14} strokeWidth={3} /> Sources verified
                </span>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <SaveButton
                item={{ slug: article.slug, title: article.title, category: category?.name ?? "", sticker: article.sticker, color, minutes: article.readingMinutes }}
              />
              <ShareButton title={article.title} />
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[420px] lg:max-w-none">
            <Cover
              seed={article.slug}
              sticker={article.sticker}
              color={color}
              image={article.coverImage}
              alt={article.coverAlt}
              scale={0.52}
              className="aspect-[4/3] rotate-2 rounded-[28px] border-[1.5px] border-ink bg-paper! shadow-[0_8px_0_var(--ink)]"
            />
            {article.coverCredit && <p className="mt-4 text-right text-xs text-tone-ink/80">{article.coverCredit}</p>}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="container-hm grid gap-10 py-12 md:py-16 lg:grid-cols-[220px_minmax(0,720px)_1fr] lg:gap-12">
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-h)+24px)]">
            <Toc items={h2} />
          </div>
        </aside>

        <article className="min-w-0">
          {article.takeaways.length > 0 && (
            <section aria-labelledby="takeaways-heading" className="relative mb-10 rounded-[24px] border-[1.5px] border-ink bg-tone-soft p-6 md:p-7">
              <Sticker name="check" size={52} rotate={10} className="absolute -right-3 -top-4" />
              <h2 id="takeaways-heading" className="eyebrow text-tone-ink">
                The short version
              </h2>
              <ul className="mt-4 space-y-3">
                {article.takeaways.map((t) => (
                  <li key={t} className="flex gap-3 text-[1.0625rem] leading-snug text-ink">
                    <span className="mt-[0.45em] size-2.5 flex-none rotate-12 rounded-[3px] bg-tone-solid" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <details className="mb-8 rounded-2xl border border-line p-4 lg:hidden">
            <summary className="eyebrow cursor-pointer text-ink-2">On this page</summary>
            <ol className="mt-3 space-y-2 text-[0.9375rem]">
              {h2.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="underline-offset-4 hover:underline">
                    {t.text}
                  </a>
                </li>
              ))}
            </ol>
          </details>

          <Prose html={html} id="article-body" />

          <FaqList faqs={article.faqs} />
          <SourcesList sources={article.sources} />

          <section className="mt-12 rounded-[22px] bg-sand p-6 text-[0.9375rem] leading-relaxed text-ink-2">
            <p>
              <strong className="font-semibold text-ink">About this article.</strong> Written by the {SITE_NAME} editors from the sources listed
              above{updated ? ` and last updated in ${updated}` : ""}. It is general information, not personal medical advice. See how we research
              and check our work in the{" "}
              <Link href="/editorial-policy" className="font-medium text-ink underline underline-offset-4">
                editorial policy
              </Link>
              , or{" "}
              <Link href="/contact" className="font-medium text-ink underline underline-offset-4">
                tell us
              </Link>{" "}
              if something looks wrong.
            </p>
            {article.tags.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <li key={tag}>
                    <Link href={`/search?q=${encodeURIComponent(tag)}`} className="chip chip-outline bg-paper hover:border-ink hover:text-ink">
                      #{tag}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <NewsletterBand name={settings.newsletter.name} blurb={settings.newsletter.blurb} source={`article:${article.slug}`} className="mt-12" />
        </article>

        <aside className="hidden xl:block" aria-hidden="true">
          <div className="sticky top-[calc(var(--header-h)+40px)] flex flex-col items-start gap-6 pl-4">
            <Sticker name={article.sticker} size={92} rotate={-10} />
            <Sticker name={category?.sticker ?? "sparkle"} size={64} rotate={12} className="ml-10" />
          </div>
        </aside>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="bg-sand py-14 md:py-20">
          <div className="container-hm">
            <div className="flex items-end justify-between gap-4">
              <h2 className="display display-md">
                Keep <span className="serif-accent">reading.</span>
              </h2>
              {category && (
                <Link href={`/topics/${category.slug}`} className={cn("btn btn-outline flex-none")}>
                  More {category.name} <Icon name="arrow-right" size={16} />
                </Link>
              )}
            </div>
            <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((a) => (
                <ArticleCard key={a.slug} article={a} category={cat.get(a.category)} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
