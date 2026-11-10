import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PageHero } from "@/components/PageHero";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { getCategories } from "@/lib/data";

export const metadata: Metadata = {
  title: "Topics",
  description: "Browse Health Maxxing by topic: nutrition, fitness, sleep, mental health, heart, gut, hormones and more.",
  alternates: { canonical: "/topics" },
};

export default async function TopicsPage() {
  const categories = await getCategories();
  return (
    <main>
      <PageHero
        color="sand"
        eyebrow="Topics"
        title={
          <>
            Sixteen ways in. <span className="serif-accent">Pick yours.</span>
          </>
        }
        lede="Every topic is a small library of its own: guides, condition pages, myths and the terms worth knowing."
        stickers={["avocado", "dumbbell", "moon"]}
        crumbs={[{ href: "/", label: "Home" }, { label: "Topics" }]}
      />
      <div className="container-hm py-10 md:py-14">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => (
            <li key={c.slug} className="reveal" style={{ transitionDelay: `${(i % 3) * 40}ms` }}>
              <Link
                href={`/topics/${c.slug}`}
                className={cn(`tone-${c.color}`, "group relative flex h-full min-h-[230px] flex-col overflow-hidden rounded-[26px] bg-tone-soft p-6 text-tone-ink transition-transform duration-300 hover:-translate-y-1")}
              >
                <p className="eyebrow">{c.tagline}</p>
                <h2 className="mt-3 text-[1.875rem] font-medium leading-none tracking-[-0.03em] text-ink">{c.name}</h2>
                <p className="mt-3 max-w-[34ch] text-[0.9375rem] leading-relaxed opacity-90">{c.description}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold">
                  {c.articleCount} {c.articleCount === 1 ? "article" : "articles"}
                  <Icon name="arrow-right" size={16} className="transition-transform group-hover:translate-x-1" />
                </span>
                <Sticker name={c.sticker} size={104} rotate={i % 2 ? 10 : -10} className="absolute -bottom-3 -right-2 transition-transform duration-300 group-hover:scale-110" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
