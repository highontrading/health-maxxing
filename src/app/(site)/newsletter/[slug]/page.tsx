import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { NewsletterBand } from "@/components/NewsletterBand";
import { Prose } from "@/components/Prose";
import { Sticker } from "@/components/stickers/Sticker";
import { getNewsletterIssue, getSettings, listNewsletterIssues } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";

type Props = PageProps<"/newsletter/[slug]">;

export async function generateStaticParams() {
  const issues = await listNewsletterIssues();
  return (issues.length ? issues.map((i) => i.slug) : ["__placeholder__"]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getNewsletterIssue(slug);
  if (!issue) return { title: "Edition not found", robots: { index: false } };
  return { title: issue.title, description: issue.preheader, alternates: { canonical: `/newsletter/${issue.slug}` } };
}

export default function IssuePage({ params }: Props) {
  return (
    <Suspense fallback={<main className="min-h-[60vh] bg-sand" aria-busy="true" />}>
      <IssueView params={params} />
    </Suspense>
  );
}

async function IssueView({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const issue = await getNewsletterIssue(slug);
  if (!issue) notFound();
  const [settings, issues] = await Promise.all([getSettings(), listNewsletterIssues()]);
  const { html } = renderMarkdown(issue.body);
  const index = issues.findIndex((i) => i.slug === issue.slug);
  const newer = issues[index - 1];
  const older = issues[index + 1];

  return (
    <main className="tone-lime bg-sand">
      <div className="container-narrow py-10 md:py-16">
        <Link href="/newsletter" className="inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline">
          <Icon name="arrow-left" size={15} /> {settings.newsletter.name}
        </Link>
        <article className="relative mt-6 rounded-[30px] border-[1.5px] border-ink bg-paper p-6 shadow-[0_8px_0_var(--ink)] md:p-12">
          <Sticker name={issue.sticker} size={84} rotate={10} className="absolute -right-1 -top-6 md:-right-6" />
          <p className="flex flex-wrap items-center gap-3 text-sm text-ink-3">
            <span className="pixel-tag">No. {String(issue.number).padStart(3, "0")}</span>
            {formatDate(issue.publishedAt)}
          </p>
          <h1 className="display display-md mt-5">{issue.title}</h1>
          <p className="lede mt-4">{issue.preheader}</p>
          <div className="dotted-rule my-8" />
          <Prose html={html} compact />
        </article>

        <nav aria-label="More editions" className="mt-8 grid gap-3 sm:grid-cols-2">
          {older ? (
            <Link href={`/newsletter/${older.slug}`} className="rounded-[20px] bg-paper p-4 hover:bg-[var(--lime-soft)]">
              <span className="eyebrow text-ink-3">Previous edition</span>
              <span className="mt-1 block font-semibold leading-snug">{older.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {newer && (
            <Link href={`/newsletter/${newer.slug}`} className="rounded-[20px] bg-paper p-4 text-right hover:bg-[var(--lime-soft)]">
              <span className="eyebrow text-ink-3">Next edition</span>
              <span className="mt-1 block font-semibold leading-snug">{newer.title}</span>
            </Link>
          )}
        </nav>

        <NewsletterBand name={settings.newsletter.name} blurb={settings.newsletter.blurb} source={`issue:${issue.slug}`} className="mt-10" />
      </div>
    </main>
  );
}
