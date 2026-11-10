import type { Metadata } from "next";
import { MythExplorer } from "@/components/explorers/MythExplorer";
import { PageHero } from "@/components/PageHero";
import { getCategories, listMyths } from "@/lib/data";

export const metadata: Metadata = {
  title: "Myth or fact",
  description: "Common health claims checked against the evidence: which are false, which are misleading and which are actually true.",
  alternates: { canonical: "/myths" },
};

export default async function MythsPage() {
  const [myths, categories] = await Promise.all([listMyths(), getCategories()]);
  return (
    <main>
      <PageHero
        color="pink"
        eyebrow="Myth or fact"
        title={
          <>
            Everyone says it. <span className="serif-accent">Is it true?</span>
          </>
        }
        lede={`${myths.length} things you have heard a hundred times, checked against the evidence. Guess first, then tap for the verdict and the source.`}
        stickers={["cross", "check", "magnifier"]}
        crumbs={[{ href: "/", label: "Home" }, { label: "Myth or fact" }]}
      />
      <div className="container-hm py-10 md:py-14">
        <MythExplorer myths={myths} categories={categories.map((c) => ({ slug: c.slug, name: c.name, color: c.color, sticker: c.sticker }))} />
      </div>
    </main>
  );
}
