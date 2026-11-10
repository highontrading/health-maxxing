import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHero } from "@/components/PageHero";
import { Prose } from "@/components/Prose";
import { cn } from "@/lib/cn";
import { getPage, getPageSlugs } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { PageTransition } from "@/components/motion/PageTransition";

type Props = PageProps<"/[page]">;

const SIBLINGS = [
  { slug: "about", label: "About" },
  { slug: "editorial-policy", label: "Editorial policy" },
  { slug: "medical-disclaimer", label: "Medical disclaimer" },
  { slug: "community-guidelines", label: "Community guidelines" },
  { slug: "privacy", label: "Privacy" },
  { slug: "terms", label: "Terms" },
  { slug: "contact", label: "Contact" },
];
const STICKERS: Record<string, string[]> = {
  about: ["heart", "sparkle", "leaf"],
  "editorial-policy": ["magnifier", "check", "sparkle"],
  "medical-disclaimer": ["stethoscope", "medkit"],
  "community-guidelines": ["chat", "smile"],
  privacy: ["shield"],
  terms: ["check"],
};

export async function generateStaticParams() {
  const slugs = (await getPageSlugs()).filter((s) => s !== "contact");
  return (slugs.length ? slugs : ["__placeholder__"]).map((page) => ({ page }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page: slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: "Page not found", robots: { index: false } };
  return { title: page.title, description: page.description, alternates: { canonical: `/${page.slug}` } };
}

export default function StaticPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <PageTransition variant="skeleton">
          <main className="min-h-[60vh] bg-sand" aria-busy="true" />
        </PageTransition>
      }
    >
      <PageTransition>
        <PageView params={params} />
      </PageTransition>
    </Suspense>
  );
}

async function PageView({ params }: Pick<Props, "params">) {
  const { page: slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();
  const { html } = renderMarkdown(page.body);

  return (
    <main>
      <PageHero color="sand" title={page.title} lede={page.description} stickers={STICKERS[page.slug] ?? ["sparkle"]} crumbs={[{ href: "/", label: "Home" }, { label: page.title }]} />
      <div className="container-hm grid gap-10 py-10 md:py-14 lg:grid-cols-[220px_minmax(0,720px)] lg:gap-14">
        <nav aria-label="About and policies" className="min-w-0 lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
          <ul className="scrollbar-none -mx-[var(--gutter)] flex gap-1.5 overflow-x-auto px-[var(--gutter)] lg:mx-0 lg:flex-col lg:px-0">
            {SIBLINGS.map((s) => (
              <li key={s.slug} className="flex-none">
                <Link
                  href={`/${s.slug}`}
                  aria-current={s.slug === page.slug ? "page" : undefined}
                  className={cn("block rounded-full px-3.5 py-2 text-[0.9375rem] font-medium", s.slug === page.slug ? "bg-ink text-paper" : "text-ink-2 hover:bg-sand")}
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="min-w-0">
          <Prose html={html} compact />
          <p className="mt-12 border-t border-line pt-5 text-sm text-ink-3">Last updated {formatDate(page.updatedAt)}</p>
        </article>
      </div>
    </main>
  );
}
