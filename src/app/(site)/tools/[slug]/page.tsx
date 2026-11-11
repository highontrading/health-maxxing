import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleRow } from "@/components/ArticleCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { Prose } from "@/components/Prose";
import { Sticker } from "@/components/stickers/Sticker";
import { Calculator } from "@/components/tools/Calculators";
import { cn } from "@/lib/cn";
import { getCategories, listArticles } from "@/lib/data";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { getTool, TOOLS } from "@/lib/tools";
import { PageTransition } from "@/components/motion/PageTransition";

type Props = PageProps<"/tools/[slug]">;

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return { title: "Tool not found", robots: { index: false } };
  return {
    title: tool.name,
    description: tool.summary,
    alternates: { canonical: `/tools/${tool.slug}` },
    openGraph: { title: tool.name, description: tool.summary, url: `/tools/${tool.slug}` },
  };
}

export default function ToolPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <PageTransition variant="skeleton">
          <ToolSkeleton />
        </PageTransition>
      }
    >
      <PageTransition>
        <ToolView params={params} />
      </PageTransition>
    </Suspense>
  );
}

/** The shape of a tool page while it loads: the header band, then the calculator card with a few fields and a result box. */
function ToolSkeleton() {
  return (
    <main className="min-h-[60vh]" aria-busy="true">
      <div className="bg-sand">
        <div className="container-hm pb-10 pt-8 md:pb-14 md:pt-12">
          <div className="skeleton h-4 w-44 max-w-full rounded-full" />
          <div className="skeleton mt-6 h-11 w-[30rem] max-w-full rounded-2xl md:h-16" />
          <div className="skeleton mt-4 h-5 w-[36rem] max-w-full rounded-full" />
        </div>
      </div>
      <div className="container-hm py-8 md:py-12">
        <div className="rounded-[30px] border-[1.5px] border-line-strong bg-paper p-5 md:p-9">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="space-y-5">
              <div className="skeleton h-9 w-40 rounded-full" />
              {[0, 1].map((i) => (
                <div key={i}>
                  <div className="skeleton h-3.5 w-20 rounded-full" />
                  <div className="skeleton mt-2 h-12 rounded-[14px]" />
                </div>
              ))}
            </div>
            <div className="skeleton min-h-[180px] rounded-[24px]" />
          </div>
        </div>
      </div>
    </main>
  );
}

async function ToolView({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const [articles, categories] = await Promise.all([listArticles(), getCategories()]);
  const cat = new Map(categories.map((c) => [c.slug, c]));
  const related = tool.related.map((s) => articles.find((a) => a.slug === s)).filter((a) => !!a);
  const others = TOOLS.filter((t) => t.slug !== tool.slug).slice(0, 13);
  const { html } = renderMarkdown(tool.about);

  return (
    <main className={`tone-${tool.color}`}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: tool.name,
          description: tool.summary,
          url: absoluteUrl(`/tools/${tool.slug}`),
          applicationCategory: "HealthApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          publisher: { "@type": "Organization", name: SITE_NAME },
        }}
      />
      <header className="bg-tone-soft">
        <div className="container-hm flex items-end gap-6 pb-10 pt-8 md:pb-14 md:pt-12">
          <div className="min-w-0 flex-1">
            <Breadcrumbs className="text-tone-ink" items={[{ href: "/", label: "Home" }, { href: "/tools", label: "Tools" }, { label: tool.short }]} />
            <h1 className="display display-lg mt-6 text-ink">{tool.name}</h1>
            <p className="mt-4 max-w-[56ch] text-[clamp(1.0625rem,1.5vw,1.25rem)] leading-[1.5] text-tone-ink">{tool.summary}</p>
          </div>
          {/* Decoration: pops in just after the page has arrived (the delay is .tool-header-sticker in tools.css). */}
          <Sticker name={tool.sticker} size={140} rotate={8} className="tool-header-sticker enter-pop hidden flex-none md:block" />
        </div>
      </header>

      <div className="container-hm py-8 md:py-12">
        <section aria-label="Calculator" className="rounded-[30px] border-[1.5px] border-ink bg-paper p-5 shadow-[0_8px_0_var(--ink)] md:p-9">
          <Calculator slug={tool.slug} />
        </section>

        <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,700px)_1fr] lg:gap-16">
          <div>
            <h2 className="display display-sm">
              How it <span className="serif-accent">works</span>
            </h2>
            <Prose html={html} compact className="mt-5" />
            {tool.sources.length > 0 && (
              <>
                <h3 className="eyebrow mt-10 text-ink-3">Sources</h3>
                <ul className="mt-3 space-y-2.5 text-[0.9375rem] leading-snug">
                  {tool.sources.map((s) => (
                    <li key={s.title} className="flex gap-2.5">
                      <span className="mt-[0.5em] size-2 flex-none rotate-12 rounded-[2px] bg-tone-solid" aria-hidden="true" />
                      <span>
                        {s.url ? (
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium underline decoration-line-strong underline-offset-[3px] transition-colors duration-(--dur-fast) hover:decoration-ink">
                            {s.title}
                          </a>
                        ) : (
                          <span className="font-medium">{s.title}</span>
                        )}
                        <span className="text-ink-3">
                          {" "}
                          · {s.publisher}
                          {s.year ? `, ${s.year}` : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-10 rounded-2xl bg-sand p-5 text-sm leading-relaxed text-ink-2">
              This tool gives an estimate for information only. It is not a diagnosis and does not replace advice from a health professional.
              Nothing you enter is stored or sent anywhere: the maths runs in your browser.
            </p>
          </div>

          {/* The side column is links, not reading text: its two blocks rise in when they are scrolled to. */}
          <aside className="space-y-10">
            {related.length > 0 && (
              <section className="reveal">
                <h2 className="eyebrow text-ink-3">Read next</h2>
                <div className="mt-3 space-y-1">
                  {related.map((a) => (
                    <ArticleRow key={a.slug} article={a} category={cat.get(a.category)} />
                  ))}
                </div>
              </section>
            )}
            <section className="reveal">
              <h2 className="eyebrow text-ink-3">More tools</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {others.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/tools/${t.slug}`} className={cn(`tone-${t.color}`, "tool-chip chip pressable py-1.5 pl-1.5 pr-3")}>
                      <Sticker name={t.sticker} size={22} flat />
                      {t.short}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/tools" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline">
                All calculators <Icon name="arrow-right" size={15} className="nudge-x" />
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
