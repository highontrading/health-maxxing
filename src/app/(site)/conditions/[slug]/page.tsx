import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleRow } from "@/components/ArticleCard";
import { ShareButton, Toc, ViewTracker } from "@/components/article/ArticleClient";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { Prose } from "@/components/Prose";
import { SourcesList } from "@/components/SourcesList";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { getBodySystems, getCategories, getCondition, getConditionSlugs, listArticles, listConditions } from "@/lib/data";
import { formatMonthYear } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { PageTransition } from "@/components/motion/PageTransition";

type Props = PageProps<"/conditions/[slug]">;

export async function generateStaticParams() {
  const slugs = await getConditionSlugs();
  return (slugs.length ? slugs : ["__placeholder__"]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCondition(slug);
  if (!c) return { title: "Condition not found", robots: { index: false } };
  return {
    title: `${c.name}: symptoms, causes and treatment`,
    description: c.summary,
    alternates: { canonical: `/conditions/${c.slug}` },
    openGraph: { type: "article", title: c.name, description: c.summary, url: `/conditions/${c.slug}` },
  };
}

export default function ConditionPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <PageTransition variant="skeleton">
          <main className="min-h-[60vh] bg-sand" aria-busy="true" />
        </PageTransition>
      }
    >
      <PageTransition>
        <ConditionView params={params} />
      </PageTransition>
    </Suspense>
  );
}

async function ConditionView({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const condition = await getCondition(slug);
  if (!condition) notFound();

  const [systems, categories, siblings, articles] = await Promise.all([
    getBodySystems(),
    getCategories(),
    listConditions(condition.system),
    listArticles({ category: condition.category, limit: 4 }),
  ]);
  const system = systems.find((s) => s.slug === condition.system);
  const category = categories.find((c) => c.slug === condition.category);
  const color = system?.color ?? "sand";
  const { html, toc } = renderMarkdown(condition.body, { citations: condition.sources.length });
  const updated = formatMonthYear(condition.reviewedAt ?? condition.updatedAt);
  const others = siblings.filter((c) => c.slug !== condition.slug).slice(0, 8);
  const url = absoluteUrl(`/conditions/${condition.slug}`);

  return (
    <main className={`tone-${color}`}>
      <ViewTracker kind="condition" slug={condition.slug} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "MedicalWebPage",
          name: condition.name,
          description: condition.summary,
          url,
          dateModified: condition.updatedAt,
          publisher: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
          about: {
            "@type": "MedicalCondition",
            name: condition.name,
            alternateName: condition.aka,
            signOrSymptom: condition.symptoms.map((s) => ({ "@type": "MedicalSymptom", name: s })),
          },
          citation: condition.sources.map((s) => s.url),
        }}
      />

      <header className="bg-tone-soft">
        <div className="container-hm relative pb-10 pt-8 md:pb-14 md:pt-12">
          <Breadcrumbs
            className="text-tone-ink"
            items={[{ href: "/", label: "Home" }, { href: "/conditions", label: "Conditions" }, ...(system ? [{ href: `/body/${system.slug}`, label: system.name }] : []), { label: condition.name }]}
          />
          <div className="mt-6 flex items-start gap-6">
            <div className="min-w-0 flex-1">
              <p className="eyebrow text-tone-ink">Condition</p>
              <h1 className="display mt-3 text-[clamp(2.25rem,5vw,3.75rem)] text-ink">{condition.name}</h1>
              {condition.aka.length > 0 && <p className="mt-3 text-[0.9375rem] text-tone-ink">Also called: {condition.aka.join(", ")}</p>}
              <p className="mt-5 max-w-[60ch] text-[clamp(1.0625rem,1.5vw,1.25rem)] leading-[1.5] text-tone-ink">{condition.summary}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-medium text-tone-ink">
                {updated && <span>Updated {updated}</span>}
                {condition.factCheck === "verified" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 text-ink">
                    <Icon name="check" size={14} strokeWidth={3} /> Sources verified
                  </span>
                )}
                <ShareButton title={condition.name} />
              </div>
            </div>
            <Sticker name={system?.sticker ?? "stethoscope"} size={150} rotate={8} className="hidden flex-none md:block" />
          </div>
        </div>
      </header>

      <div className="container-hm grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,720px)_1fr] lg:gap-14">
        <article className="min-w-0">
          {condition.urgent.length > 0 && (
            <section aria-labelledby="urgent-heading" className="mb-10 rounded-[24px] border-[1.5px] border-ink bg-[var(--pink-soft)] p-6 text-[var(--pink-ink)]">
              <h2 id="urgent-heading" className="flex items-center gap-2.5 text-lg font-bold">
                <Sticker name="medkit" size={36} flat />
                Call your local emergency number if you have:
              </h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {condition.urgent.map((u) => (
                  <li key={u} className="flex gap-2.5 text-[0.9375rem] font-medium leading-snug">
                    <Icon name="alert" size={18} className="mt-0.5 flex-none" />
                    {u}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Prose html={html} compact id="article-body" />
          <SourcesList sources={condition.sources} />

          <p className="mt-12 rounded-[22px] bg-sand p-6 text-[0.9375rem] leading-relaxed text-ink-2">
            <strong className="font-semibold text-ink">This page is general information.</strong> It cannot tell you what is causing your
            symptoms and it is not a substitute for seeing a health professional. Read our{" "}
            <Link href="/medical-disclaimer" className="font-medium text-ink underline underline-offset-4">
              medical disclaimer
            </Link>{" "}
            and{" "}
            <Link href="/editorial-policy" className="font-medium text-ink underline underline-offset-4">
              editorial policy
            </Link>
            .
          </p>
        </article>

        <aside className="space-y-6">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:space-y-6">
            <section className="rounded-[24px] border-[1.5px] border-ink p-5">
              <h2 className="eyebrow text-ink-3">Common symptoms</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {condition.symptoms.map((s) => (
                  <li key={s} className="chip whitespace-normal text-left leading-snug">
                    {s}
                  </li>
                ))}
              </ul>
              <div className="dotted-rule my-5" />
              <dl className="space-y-3 text-[0.9375rem]">
                {system && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-3">Body system</dt>
                    <dd>
                      <Link href={`/body/${system.slug}`} className="font-semibold underline-offset-4 hover:underline">
                        {system.name}
                      </Link>
                    </dd>
                  </div>
                )}
                {category && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-3">Topic</dt>
                    <dd>
                      <Link href={`/topics/${category.slug}`} className="font-semibold underline-offset-4 hover:underline">
                        {category.name}
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
            </section>
            <div className="hidden lg:block">
              <Toc items={toc.filter((t) => t.level === 2)} />
            </div>
          </div>
        </aside>
      </div>

      {(articles.length > 0 || others.length > 0) && (
        <section className="bg-sand py-12 md:py-16">
          <div className="container-hm grid gap-12 lg:grid-cols-2">
            {articles.length > 0 && (
              <div>
                <h2 className="display display-sm">
                  Related <span className="serif-accent">reading</span>
                </h2>
                <div className="mt-5 space-y-1">
                  {articles.map((a) => (
                    <ArticleRow key={a.slug} article={a} category={category} className="hover:bg-paper" />
                  ))}
                </div>
              </div>
            )}
            {others.length > 0 && system && (
              <div>
                <h2 className="display display-sm">
                  More in <span className="serif-accent">{system.name.toLowerCase()}</span>
                </h2>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {others.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/conditions/${c.slug}`} className={cn("inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-paper px-4 py-2 text-[0.9375rem] font-semibold transition-colors hover:bg-tone-soft")}>
                        {c.name}
                        <Icon name="arrow-right" size={14} />
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href={`/body/${system.slug}`} className="btn btn-outline mt-6">
                  All {system.name} conditions
                </Link>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
