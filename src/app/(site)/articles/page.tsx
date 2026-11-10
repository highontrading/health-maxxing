import type { Metadata } from "next";
import { ArticleExplorer } from "@/components/explorers/ArticleExplorer";
import { PageHero } from "@/components/PageHero";
import { getCategories, listArticles } from "@/lib/data";

export const metadata: Metadata = {
  title: "All articles",
  description: "Every Health Maxxing guide, explainer and checklist in one place. Filter by topic or format.",
  alternates: { canonical: "/articles" },
};

export default async function ArticlesPage() {
  const [articles, categories] = await Promise.all([listArticles(), getCategories()]);
  return (
    <main>
      <PageHero
        color="lime"
        eyebrow="The library"
        title={
          <>
            Every article, <span className="serif-accent">all in one place.</span>
          </>
        }
        lede={`${articles.length} guides, explainers and checklists across ${categories.length} topics. All sourced, all written to be used.`}
        stickers={["magnifier", "bolt", "leaf"]}
        crumbs={[{ href: "/", label: "Home" }, { label: "Articles" }]}
      />
      <div className="container-hm py-10 md:py-14">
        <ArticleExplorer articles={articles} categories={categories.map((c) => ({ slug: c.slug, name: c.name, color: c.color, sticker: c.sticker }))} />
      </div>
    </main>
  );
}
