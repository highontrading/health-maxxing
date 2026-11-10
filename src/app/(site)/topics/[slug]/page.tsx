import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleBento, ArticleCard } from "@/components/ArticleCard";
import { Icon } from "@/components/Icon";
import { MythCard } from "@/components/MythCard";
import { PageHero } from "@/components/PageHero";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { getBodySystems, getCategories, getCategory, listArticles, listConditionsByCategory, listGlossary, listMyths } from "@/lib/data";
import { TOOLS } from "@/lib/tools";

type Props = PageProps<"/topics/[slug]">;

export async function generateStaticParams() {
  const categories = await getCategories();
  return (categories.length ? categories.map((c) => c.slug) : ["__placeholder__"]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Topic not found", robots: { index: false } };
  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: `/topics/${category.slug}` },
    openGraph: { title: `${category.name}: ${category.tagline}`, description: category.description, url: `/topics/${category.slug}` },
  };
}

export default function TopicPage({ params }: Props) {
  return (
    <Suspense fallback={<main className="min-h-[60vh] bg-sand" aria-busy="true" />}>
      <TopicView params={params} />
    </Suspense>
  );
}

async function TopicView({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const [articles, conditions, myths, glossary, systems, categories] = await Promise.all([
    listArticles({ category: slug }),
    listConditionsByCategory(slug, 12),
    listMyths(slug),
    listGlossary(),
    getBodySystems(),
    getCategories(),
  ]);
  const terms = glossary.filter((t) => t.category === slug).slice(0, 8);
  const tools = TOOLS.filter((t) => t.category === slug);
  const lead = articles.find((a) => a.featured) ?? articles[0];
  const rest = articles.filter((a) => a.slug !== lead?.slug);
  const systemName = new Map(systems.map((s) => [s.slug, s.name]));
  const index = categories.findIndex((c) => c.slug === slug);
  const neighbors =
    categories.length > 2
      ? [categories[(index - 1 + categories.length) % categories.length], categories[(index + 1) % categories.length]]
      : [];

  return (
    <main className={`tone-${category.color}`}>
      <PageHero
        color={category.color}
        eyebrow={category.tagline}
        title={category.name}
        lede={category.description}
        stickers={[category.sticker, lead?.sticker ?? "sparkle", "sparkle"]}
        crumbs={[{ href: "/", label: "Home" }, { href: "/topics", label: "Topics" }, { label: category.name }]}
      >
        <ul className="flex flex-wrap gap-2 text-sm font-semibold text-tone-ink">
          <li className="rounded-full bg-paper px-3 py-1.5">{articles.length} {articles.length === 1 ? "article" : "articles"}</li>
          {conditions.length > 0 && <li className="rounded-full bg-paper px-3 py-1.5">{conditions.length} conditions</li>}
          {myths.length > 0 && <li className="rounded-full bg-paper px-3 py-1.5">{myths.length} myths checked</li>}
          {tools.length > 0 && <li className="rounded-full bg-paper px-3 py-1.5">{tools.length} {tools.length === 1 ? "tool" : "tools"}</li>}
        </ul>
      </PageHero>

      <div className="container-hm py-10 md:py-14">
        {articles.length === 0 ? (
          <div className="flex flex-col items-center rounded-[26px] bg-sand px-6 py-16 text-center">
            <Sticker name={category.sticker} size={96} rotate={-8} />
            <p className="mt-5 text-xl font-medium">Articles for this topic are on the way.</p>
            <Link href="/articles" className="btn btn-outline mt-5">
              Browse everything else
            </Link>
          </div>
        ) : (
          <>
            {lead && <ArticleBento article={lead} category={category} size="lg" className="min-h-[340px]!" />}
            {rest.length > 0 && (
              <div className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((a) => (
                  <ArticleCard key={a.slug} article={a} category={category} headingLevel={2} className="reveal" />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {tools.length > 0 && (
        <section className="bg-sand py-12 md:py-16">
          <div className="container-hm">
            <h2 className="display display-sm">
              Tools for <span className="serif-accent">{category.name.toLowerCase()}</span>
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {tools.map((t) => (
                <li key={t.slug}>
                  <Link href={`/tools/${t.slug}`} className={cn(`tone-${t.color}`, "group flex h-full items-center gap-4 rounded-[22px] bg-paper p-4 transition-colors hover:bg-tone-soft")}>
                    <Sticker name={t.sticker} size={48} rotate={-6} className="transition-transform group-hover:scale-110" />
                    <span className="min-w-0">
                      <span className="block font-semibold leading-tight">{t.short}</span>
                      <span className="line-clamp-2 block text-sm text-ink-3">{t.summary}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {conditions.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container-hm">
            <div className="flex items-end justify-between gap-4">
              <h2 className="display display-sm">
                Related <span className="serif-accent">conditions</span>
              </h2>
              <Link href="/conditions" className="btn btn-outline btn-sm flex-none">
                A to Z <Icon name="arrow-right" size={14} />
              </Link>
            </div>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {conditions.map((c) => (
                <li key={c.slug}>
                  <Link href={`/conditions/${c.slug}`} className="group flex h-full flex-col rounded-[20px] border-[1.5px] border-line-strong p-4 transition-colors hover:border-ink hover:bg-tone-soft">
                    <span className="eyebrow text-ink-3">{systemName.get(c.system) ?? "Condition"}</span>
                    <span className="mt-2 text-lg font-semibold leading-tight tracking-[-0.01em]">{c.name}</span>
                    <span className="mt-1.5 line-clamp-2 text-sm leading-snug text-ink-2">{c.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {myths.length > 0 && (
        <section className="bg-sand py-12 md:py-16">
          <div className="container-hm">
            <div className="flex items-end justify-between gap-4">
              <h2 className="display display-sm">
                Myth or <span className="serif-accent">fact?</span>
              </h2>
              <Link href="/myths" className="btn btn-outline btn-sm flex-none">
                All myths <Icon name="arrow-right" size={14} />
              </Link>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {myths.slice(0, 3).map((m) => (
                <MythCard key={m.slug} myth={m} detailed />
              ))}
            </div>
          </div>
        </section>
      )}

      {terms.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container-hm">
            <div className="flex items-end justify-between gap-4">
              <h2 className="display display-sm">
                Words worth <span className="serif-accent">knowing</span>
              </h2>
              <Link href="/glossary" className="btn btn-outline btn-sm flex-none">
                Glossary <Icon name="arrow-right" size={14} />
              </Link>
            </div>
            <dl className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
              {terms.map((t) => (
                <div key={t.slug} className="border-t-[1.5px] border-ink pt-4">
                  <dt className="text-lg font-semibold tracking-[-0.01em]">
                    <Link href={`/glossary#${t.slug}`} className="underline-offset-4 hover:underline">
                      {t.term}
                    </Link>
                  </dt>
                  <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-2">{t.definition}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      <nav aria-label="More topics" className="border-t border-line bg-paper py-10">
        <div className="container-hm grid gap-3 sm:grid-cols-2">
          {neighbors.map((c, i) => (
            <Link key={c.slug} href={`/topics/${c.slug}`} className={cn(`tone-${c.color}`, "group flex items-center gap-4 rounded-[22px] bg-tone-soft p-5", i === 1 && "sm:flex-row-reverse sm:text-right")}>
              <Sticker name={c.sticker} size={56} rotate={i ? 8 : -8} className="transition-transform group-hover:scale-110" />
              <span>
                <span className="eyebrow block text-tone-ink">{i === 0 ? "Previous topic" : "Next topic"}</span>
                <span className="mt-1 block text-xl font-medium tracking-[-0.02em]">{c.name}</span>
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
