import Link from "next/link";
import { ArticleBento, ArticleCard } from "@/components/ArticleCard";
import { BodyMap } from "@/components/BodyMap";
import { Draggable } from "@/components/Draggable";
import { Icon } from "@/components/Icon";
import { LabelSticker } from "@/components/LabelSticker";
import { Manifesto } from "@/components/Manifesto";
import { MythCard } from "@/components/MythCard";
import { SectionHeading } from "@/components/SectionHeading";
import { Sticker } from "@/components/stickers/Sticker";
import { getBodySystems, getCategories, getSettings, getSiteStats, listArticles, listMyths } from "@/lib/data";
import { formatMonthYear, formatNumber, hash } from "@/lib/format";
import { TOOLS } from "@/lib/tools";
import { cn } from "@/lib/cn";

export default async function HomePage() {
  const [settings, categories, articles, systems, myths, stats] = await Promise.all([
    getSettings(),
    getCategories(),
    listArticles(),
    getBodySystems(),
    listMyths(),
    getSiteStats(),
  ]);
  const cat = new Map(categories.map((c) => [c.slug, c]));
  const featured = articles.filter((a) => a.featured);
  const cover = articles.find((a) => a.slug === settings.home.coverStory) ?? featured[0] ?? articles[0];
  const bento = featured.filter((a) => a.slug !== cover?.slug).slice(0, 6);
  const used = new Set([cover?.slug, ...bento.map((a) => a.slug)]);
  const latest = articles.filter((a) => !used.has(a.slug)).slice(0, 6);
  const coverLines = bento.slice(0, 3);
  // A stable handful of myths that changes when the collection does.
  const mythPicks = [...myths].sort((a, b) => hash(a.slug) - hash(b.slug)).slice(0, 3);
  const home = settings.home;

  return (
    <main>
      {/* ------------------------------------------------ Hero */}
      <section className="relative overflow-hidden bg-paper">
        <div className="container-hm relative grid gap-14 pb-16 pt-10 md:pt-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-10 lg:pb-24 lg:pt-20">
          <div className="relative z-10">
            <p className="eyebrow inline-flex items-center gap-2 rounded-full bg-sand px-3 py-2 text-ink-2">
              <span className="size-2 rounded-full bg-[var(--pink-solid)]" />
              {home.eyebrow}
            </p>
            <h1 className="display display-xl mt-6">
              {home.title}
              <br />
              <span className="serif-accent">{home.accent}</span>
            </h1>
            <p className="lede mt-6 max-w-[40ch]">{home.lede}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/articles" className="btn btn-primary btn-lg">
                Start reading <Icon name="arrow-right" size={18} />
              </Link>
              <Link href="/body" className="btn btn-outline btn-lg">
                Explore the body map
              </Link>
            </div>
            <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
              {[
                { n: stats.articles, label: "articles" },
                { n: stats.conditions, label: "conditions explained" },
                { n: stats.tools, label: "calculators" },
                { n: 0, label: "detox teas" },
              ].map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="flex items-baseline gap-2">
                    <span className="text-[2rem] font-medium leading-none tracking-[-0.04em]">{formatNumber(s.n)}</span>
                    <span className="text-sm text-ink-3">{s.label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Cover + loose stickers */}
          <div className="relative mx-auto w-full max-w-[460px] lg:max-w-none">
            {cover && (
              <article
                className={cn(
                  `tone-${cat.get(cover.category)?.color ?? "lime"}`,
                  "group relative mx-auto flex aspect-[4/5] w-full max-w-[400px] -rotate-2 flex-col rounded-[30px] border-[1.5px] border-ink bg-tone-soft p-6 shadow-[0_10px_0_var(--ink)] transition-transform duration-300 hover:rotate-0",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="eyebrow">Health Maxxing</span>
                  <span className="pixel-tag">{formatMonthYear(cover.publishedAt) || "This month"}</span>
                </div>
                <div className="flex flex-1 items-center justify-center py-2">
                  <Sticker name={cover.sticker} size="58%" rotate={6} style={{ height: "auto", aspectRatio: "1 / 1" }} className="transition-transform duration-300 group-hover:scale-110" />
                </div>
                <p className="eyebrow">Cover story</p>
                <h2 className="mt-2 text-[clamp(1.5rem,2.4vw,2rem)] font-medium leading-[1.05] tracking-[-0.03em] text-balance">
                  <Link href={`/articles/${cover.slug}`} className="after:absolute after:inset-0 after:rounded-[30px]">
                    {cover.title}
                  </Link>
                </h2>
                {coverLines.length > 0 && (
                  <ul className="relative z-10 mt-4 space-y-1.5 border-t-[1.5px] border-ink/20 pt-3 text-[0.8125rem] font-medium">
                    {coverLines.map((a) => (
                      <li key={a.slug} className="flex items-center gap-2">
                        <Sticker name={a.sticker} size={18} flat />
                        <Link href={`/articles/${a.slug}`} className="truncate underline-offset-2 hover:underline">
                          {a.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            )}
            <Draggable className="absolute -left-2 top-[2%] sm:-left-8 lg:-left-10" style={{ animation: "floaty 7s ease-in-out infinite" }}>
              <Sticker name="avocado" size={104} rotate={-14} className="max-sm:size-20!" />
            </Draggable>
            <Draggable className="absolute -right-1 top-[-3%] sm:-right-6" style={{ animation: "floaty 8s ease-in-out -2s infinite" }}>
              <Sticker name="dumbbell" size={112} rotate={10} className="max-sm:size-20!" />
            </Draggable>
            <Draggable className="absolute -left-3 bottom-[20%] sm:-left-12 lg:-left-16" style={{ animation: "floaty 6.5s ease-in-out -1s infinite" }}>
              <Sticker name="moon" size={92} rotate={-8} className="max-sm:size-[72px]!" />
            </Draggable>
            <Draggable className="absolute -right-2 bottom-[6%] sm:-right-8" style={{ animation: "floaty 7.5s ease-in-out -3s infinite" }}>
              <Sticker name="brain" size={104} rotate={12} className="max-sm:size-20!" />
            </Draggable>
            <Draggable className="absolute right-[2%] top-[34%] hidden sm:block lg:-right-4">
              <LabelSticker rotate={9} className="text-sm">8 hrs or bust</LabelSticker>
            </Draggable>
            <Draggable className="absolute -left-4 top-[40%] hidden sm:block lg:-left-12">
              <LabelSticker variant="tag" rotate={-9} className="text-[0.8125rem]">Hydrated</LabelSticker>
            </Draggable>
            <Draggable className="absolute bottom-[-7%] left-[2%] hidden sm:block">
              <LabelSticker variant="oval" rotate={-5} className="text-[0.9375rem]">fiber fan club</LabelSticker>
            </Draggable>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Topic sticker sheet */}
      <section className="bg-sand py-16 md:py-24">
        <div className="container-hm">
          <SectionHeading
            eyebrow="The sticker sheet"
            title={
              <>
                Pick a sticker. <span className="serif-accent">Start anywhere.</span>
              </>
            }
            lede={`${stats.categories} topics, from what is on your plate to what is on your mind. Every one is built from sourced, plain-language guides.`}
            href="/topics"
            cta="All topics"
          />
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {categories.map((c, i) => (
              <li key={c.slug} className="reveal" style={{ transitionDelay: `${(i % 8) * 35}ms` }}>
                <Link
                  href={`/topics/${c.slug}`}
                  className={cn(
                    `tone-${c.color}`,
                    "kiss-cut group flex h-full flex-col items-center gap-3 bg-paper px-3 py-5 text-center transition-colors duration-200 hover:border-solid hover:border-ink hover:bg-tone-soft",
                  )}
                >
                  <Sticker name={c.sticker} size={68} rotate={((i * 7) % 15) - 7} className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
                  <span>
                    <span className="block text-[0.9375rem] font-semibold leading-tight">{c.name}</span>
                    <span className="mt-1 block text-xs text-ink-3">{c.articleCount} {c.articleCount === 1 ? "read" : "reads"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------ Cover stories */}
      {bento.length > 0 && (
        <section className="bg-sand pb-16 md:pb-24">
          <div className="container-hm">
            <SectionHeading
              eyebrow="Start here"
              title={
                <>
                  The big questions, <span className="serif-accent">answered properly.</span>
                </>
              }
              href="/articles"
              cta="All articles"
            />
            <div className="mt-10 grid gap-4 md:grid-cols-6 lg:grid-cols-12">
              {bento[0] && <ArticleBento article={bento[0]} category={cat.get(bento[0].category)} size="lg" className="reveal md:col-span-6 lg:col-span-7 lg:row-span-2" />}
              {bento[1] && <ArticleBento article={bento[1]} category={cat.get(bento[1].category)} solid className="reveal md:col-span-3 lg:col-span-5" />}
              {bento[2] && <ArticleBento article={bento[2]} category={cat.get(bento[2].category)} className="reveal md:col-span-3 lg:col-span-5" />}
              {bento.slice(3, 6).map((a, i) => (
                <ArticleBento key={a.slug} article={a} category={cat.get(a.category)} size="sm" solid={i === 1} className="reveal md:col-span-2 lg:col-span-4" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------ Ticker */}
      <div className="marquee border-y-[1.5px] border-ink bg-[var(--lime-solid)] py-4" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex flex-none items-center">
              {home.ticker.map((line, i) => (
                <li key={`${copy}-${i}`} className="flex items-center gap-6 pr-6 text-[1.375rem] font-medium tracking-[-0.02em] md:text-[1.75rem]">
                  <span className="whitespace-nowrap">{line}</span>
                  <Sticker name={["sparkle", "heart", "bolt", "star", "leaf"][i % 5]} size={30} flat rotate={(i % 2 ? 1 : -1) * 10} />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ Body map */}
      <section className="bg-paper py-16 md:py-24">
        <div className="container-hm grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow mb-4 text-ink-3">The body map</p>
            <h2 className="display display-md">
              Something feel off? <span className="serif-accent">Start with where.</span>
            </h2>
            <p className="lede mt-4">
              {formatNumber(stats.conditions)} conditions, organised by the part of you they affect. Each page covers symptoms, causes, treatment and
              when to see a doctor, with sources.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/body" className="btn btn-primary">
                Open the body map <Icon name="arrow-right" size={16} />
              </Link>
              <Link href="/conditions" className="btn btn-outline">
                Conditions A to Z
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-2 md:hidden">
              {systems.map((s) => (
                <li key={s.slug}>
                  <Link href={`/body/${s.slug}`} className={cn(`tone-${s.color}`, "chip")}>
                    <Sticker name={s.sticker} size={18} flat />
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden rounded-[30px] bg-sand p-4 md:block lg:p-6">
            <BodyMap systems={systems.map((s) => ({ slug: s.slug, name: s.name, sticker: s.sticker, color: s.color, conditionCount: s.conditionCount }))} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Tools */}
      <section className="bg-sand py-16 md:py-24">
        <div className="container-hm">
          <SectionHeading
            eyebrow="Calculators"
            title={
              <>
                We did the maths <span className="serif-accent">so you don&apos;t have to.</span>
              </>
            }
            lede="Fourteen tools built on published formulas, each one honest about what its number can and cannot tell you."
            href="/tools"
            cta="All tools"
          />
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.slice(0, 8).map((t, i) => (
              <li key={t.slug} className="reveal" style={{ transitionDelay: `${(i % 4) * 40}ms` }}>
                <Link
                  href={`/tools/${t.slug}`}
                  className={cn(`tone-${t.color}`, "group relative flex h-full min-h-[176px] flex-col rounded-[24px] bg-paper p-5 transition-all duration-200 hover:-translate-y-1 hover:bg-tone-soft")}
                >
                  <span className="flex items-start justify-between">
                    <Sticker name={t.sticker} size={56} rotate={-6} className="transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" />
                    <span className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-ink transition-colors group-hover:bg-ink group-hover:text-paper">
                      <Icon name="arrow-up-right" size={16} />
                    </span>
                  </span>
                  <span className="mt-auto block pt-4 text-lg font-semibold leading-tight tracking-[-0.015em]">{t.short}</span>
                  <span className="mt-1 line-clamp-2 block text-sm leading-snug text-ink-3 group-hover:text-tone-ink">{t.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------ Latest */}
      {latest.length > 0 && (
        <section className="bg-paper py-16 md:py-24">
          <div className="container-hm">
            <SectionHeading
              eyebrow="Fresh off the press"
              title={
                <>
                  Latest <span className="serif-accent">reads.</span>
                </>
              }
              href="/articles"
              cta={`All ${formatNumber(stats.articles)} articles`}
            />
            <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((a) => (
                <ArticleCard key={a.slug} article={a} category={cat.get(a.category)} className="reveal" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------ Myths */}
      {mythPicks.length > 0 && (
        <section className="bg-sand py-16 md:py-24">
          <div className="container-hm">
            <SectionHeading
              eyebrow="Myth or fact"
              title={
                <>
                  Things everyone says. <span className="serif-accent">Some are even true.</span>
                </>
              }
              href="/myths"
              cta={`All ${myths.length} myths`}
            />
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {mythPicks.map((m) => (
                <MythCard key={m.slug} myth={m} className="reveal" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------ Manifesto */}
      <section className="bg-paper py-20 md:py-32">
        <div className="container-hm text-center">
          <p className="eyebrow text-ink-3">The Health Maxxing manifesto</p>
          <Manifesto
            text={home.manifesto}
            className="mx-auto mt-8 max-w-[22ch] text-[clamp(2rem,5.6vw,4.75rem)] font-normal leading-[1.08] tracking-[-0.035em] text-balance md:max-w-[24ch]"
          />
          <Link href="/about" className="btn btn-outline mt-12">
            How we work <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------ Community */}
      {settings.community.enabled && (
        <section className="bg-paper pb-16 md:pb-24">
          <div className="container-hm">
            <div className="tone-blue relative overflow-hidden rounded-[30px] bg-tone-soft p-8 md:p-14">
              <div className="relative z-10 max-w-xl">
                <p className="eyebrow text-tone-ink">The community</p>
                <h2 className="display display-md mt-4 text-tone-ink">
                  Compare notes with people <span className="serif-accent">doing the work.</span>
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-tone-ink/85">
                  Ask what a study really means, share what is working, or post your first 5K time. Friendly, moderated and free of miracle cures.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/community" className="btn btn-primary">
                    Visit the community <Icon name="arrow-right" size={16} />
                  </Link>
                  <Link href="/signup" className="btn btn-outline">
                    Create an account
                  </Link>
                </div>
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] md:block" aria-hidden="true">
                <Sticker name="chat" size={150} rotate={-8} className="absolute right-[38%] top-[14%]" />
                <Sticker name="smile" size={110} rotate={10} className="absolute right-[8%] top-[10%]" />
                <Sticker name="medal" size={104} rotate={-10} className="absolute bottom-[10%] right-[12%]" />
                <LabelSticker variant="lime" rotate={-6} className="absolute bottom-[18%] right-[46%] text-xs">
                  be kind, cite sources
                </LabelSticker>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
