import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import { Icon } from "@/components/Icon";
import { PageHero } from "@/components/PageHero";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { getBodySystems, getCategories, listArticles, listConditions } from "@/lib/data";

type Props = PageProps<"/body/[slug]">;

export async function generateStaticParams() {
  const systems = await getBodySystems();
  return (systems.length ? systems.map((s) => s.slug) : ["__placeholder__"]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const system = (await getBodySystems()).find((s) => s.slug === slug);
  if (!system) return { title: "Not found", robots: { index: false } };
  return {
    title: `${system.name}: conditions and guides`,
    description: system.description,
    alternates: { canonical: `/body/${system.slug}` },
  };
}

export default function BodySystemPage({ params }: Props) {
  return (
    <Suspense fallback={<main className="min-h-[60vh] bg-sand" aria-busy="true" />}>
      <SystemView params={params} />
    </Suspense>
  );
}

async function SystemView({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const systems = await getBodySystems();
  const system = systems.find((s) => s.slug === slug);
  if (!system) notFound();

  const [conditions, categories, allArticles] = await Promise.all([listConditions(slug), getCategories(), listArticles()]);
  const cat = new Map(categories.map((c) => [c.slug, c]));
  const topics = system.categories.map((c) => cat.get(c)).filter((c) => !!c);
  const articles = allArticles.filter((a) => system.categories.includes(a.category)).slice(0, 6);
  const index = systems.findIndex((s) => s.slug === slug);
  const neighbors = systems.length > 2 ? [systems[(index - 1 + systems.length) % systems.length], systems[(index + 1) % systems.length]] : [];

  return (
    <main className={`tone-${system.color}`}>
      <PageHero
        color={system.color}
        eyebrow="Body system"
        title={system.name}
        lede={system.description}
        stickers={[system.sticker]}
        crumbs={[{ href: "/", label: "Home" }, { href: "/body", label: "Body map" }, { label: system.name }]}
      >
        <ul className="flex flex-wrap gap-2">
          {system.organs.map((o) => (
            <li key={o} className="rounded-full bg-paper px-3 py-1.5 text-sm font-semibold text-ink">
              {o}
            </li>
          ))}
        </ul>
      </PageHero>

      <div className="container-hm py-10 md:py-14">
        <h2 className="display display-sm">
          Conditions <span className="serif-accent">we cover</span>
        </h2>
        {conditions.length ? (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {conditions.map((c) => (
              <li key={c.slug}>
                <Link href={`/conditions/${c.slug}`} className="group flex h-full flex-col rounded-[20px] border-[1.5px] border-line-strong p-5 transition-colors hover:border-ink hover:bg-tone-soft">
                  <span className="text-xl font-semibold leading-tight tracking-[-0.015em]">{c.name}</span>
                  {c.aka.length > 0 && <span className="mt-1 text-xs text-ink-3">Also: {c.aka.slice(0, 2).join(", ")}</span>}
                  <span className="mt-2 line-clamp-3 text-[0.9375rem] leading-snug text-ink-2">{c.summary}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold">
                    Read more <Icon name="arrow-right" size={15} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 rounded-2xl bg-sand p-6 text-ink-2">Condition pages for this system are on the way.</p>
        )}
      </div>

      {topics.length > 0 && (
        <section className="bg-sand py-12 md:py-16">
          <div className="container-hm">
            <h2 className="display display-sm">
              Related <span className="serif-accent">topics</span>
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((c) => (
                <li key={c.slug}>
                  <Link href={`/topics/${c.slug}`} className={cn(`tone-${c.color}`, "group flex items-center gap-4 rounded-[22px] bg-paper p-4 transition-colors hover:bg-tone-soft")}>
                    <Sticker name={c.sticker} size={52} rotate={-6} className="transition-transform group-hover:scale-110" />
                    <span>
                      <span className="block text-lg font-semibold leading-tight">{c.name}</span>
                      <span className="block text-sm text-ink-3">{c.tagline}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {articles.length > 0 && (
              <div className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((a) => (
                  <ArticleCard key={a.slug} article={a} category={cat.get(a.category)} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <nav aria-label="More body systems" className="border-t border-line bg-paper py-10">
        <div className="container-hm grid gap-3 sm:grid-cols-2">
          {neighbors.map((s, i) => (
            <Link key={s.slug} href={`/body/${s.slug}`} className={cn(`tone-${s.color}`, "group flex items-center gap-4 rounded-[22px] bg-tone-soft p-5", i === 1 && "sm:flex-row-reverse sm:text-right")}>
              <Sticker name={s.sticker} size={56} rotate={i ? 8 : -8} className="transition-transform group-hover:scale-110" />
              <span>
                <span className="eyebrow block text-tone-ink">{i === 0 ? "Previous" : "Next"}</span>
                <span className="mt-1 block text-xl font-medium tracking-[-0.02em]">{s.name}</span>
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
