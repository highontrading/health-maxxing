import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { NewsletterForm } from "@/components/NewsletterForm";
import { stagger } from "@/components/motion/stagger";
import { Sticker } from "@/components/stickers/Sticker";
import { getSettings, listNewsletterIssues } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { PageTransition } from "@/components/motion/PageTransition";

export async function generateMetadata(): Promise<Metadata> {
  const { newsletter } = await getSettings();
  return {
    title: `${newsletter.name}: the newsletter`,
    description: newsletter.blurb,
    alternates: { canonical: "/newsletter" },
  };
}

export default async function NewsletterPage() {
  const [settings, issues] = await Promise.all([getSettings(), listNewsletterIssues()]);
  const { newsletter } = settings;
  return (
    <PageTransition>
      <main>
        <section className="relative overflow-hidden bg-ink text-paper">
          <div className="container-hm relative grid gap-12 py-16 md:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="eyebrow text-lime">{newsletter.cadence} · Free</p>
              <h1 className="display display-xl mt-5">
                {newsletter.name.replace(/^The /, "The ")}
                <span className="serif-accent text-lime">.</span>
              </h1>
              <p className="mt-6 max-w-[44ch] text-[clamp(1.125rem,1.6vw,1.375rem)] leading-[1.45] text-white/80">{newsletter.blurb}</p>
              <NewsletterForm source="newsletter-page" dark className="mt-8" cta="Sign me up" />
              <ul className="mt-10 grid max-w-xl gap-3 text-[0.9375rem] text-white/80 sm:grid-cols-3">
                {["One email, once a week", "Every claim sourced", "Unsubscribe in one click"].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Icon name="check" size={18} strokeWidth={3} className="mt-0.5 flex-none text-lime" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            {/* Decoration only: the card rises in, then the stickers pop in around it. The heading and the form hold still. */}
            <div className="newsletter-hero-art relative mx-auto hidden h-[420px] w-full max-w-[440px] lg:block" aria-hidden="true">
              <div className="enter-rise absolute left-6 top-8 w-[320px] -rotate-3 rounded-[26px] bg-paper p-6 text-ink shadow-pop">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">Rx · {newsletter.name}</span>
                  <span className="pixel-tag">Repeat weekly</span>
                </div>
                <p className="mt-5 text-[1.75rem] font-medium leading-[1.05] tracking-[-0.03em]">One useful thing about your body.</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">Take with coffee. May cause informed decisions and fewer impulse supplement purchases.</p>
                <div className="dotted-rule my-5" />
                <p className="eyebrow text-ink-3">Refills: unlimited</p>
              </div>
              <Sticker name="pill" size={120} rotate={-18} className="enter-pop absolute right-0 top-0" style={stagger(2)} />
              <Sticker name="mail" size={132} rotate={10} className="enter-pop absolute bottom-4 right-4" style={stagger(3)} />
              <Sticker name="coffee" size={92} rotate={-8} className="enter-pop absolute bottom-0 left-0" style={stagger(4)} />
            </div>
          </div>
        </section>

        <section className="container-hm py-12 md:py-16">
          <h2 className="display display-sm">
            Past <span className="serif-accent">editions</span>
          </h2>
          {issues.length ? (
            <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {issues.map((issue) => (
                <li key={issue.slug} className="reveal">
                  <Link href={`/newsletter/${issue.slug}`} className="reading-link-card group flex h-full flex-col rounded-[24px] border-[1.5px] border-ink p-6 hover:bg-[var(--lime-soft)]">
                    <span className="flex items-center justify-between">
                      <span className="pixel-tag">No. {String(issue.number).padStart(3, "0")}</span>
                      <Sticker name={issue.sticker} size={48} rotate={8} className="group-hover:scale-110" />
                    </span>
                    <span className="mt-5 text-[1.375rem] font-medium leading-tight tracking-[-0.02em]">{issue.title}</span>
                    <span className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">{issue.preheader}</span>
                    <span className="mt-auto flex items-center justify-between pt-5 text-sm">
                      <span className="text-ink-3">{formatDate(issue.publishedAt)}</span>
                      <span className="inline-flex items-center gap-1 font-semibold">
                        Read <Icon name="arrow-right" size={15} className="nudge-x" />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 rounded-2xl bg-sand p-6 text-ink-2">The first edition is on its way. Subscribe above and it will land in your inbox.</p>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
