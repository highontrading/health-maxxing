import type { Metadata } from "next";
import { SearchPageClient } from "@/components/explorers/SearchPageClient";
import { getCategories } from "@/lib/data";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Health Maxxing articles, conditions, calculators, foods, exercises and glossary terms.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

export default async function SearchPage() {
  const categories = await getCategories();
  const colorOf = Object.fromEntries(categories.map((c) => [c.slug, c.color]));
  return (
    <main className="bg-sand">
      <div className="container-narrow py-12 md:py-20">
        <p className="eyebrow text-ink-3">Search</p>
        <h1 className="display display-lg mt-4">
          What are you <span className="serif-accent">looking for?</span>
        </h1>
        <div className="mt-8">
          <SearchPageClient colorOf={colorOf} />
        </div>
      </div>
    </main>
  );
}
