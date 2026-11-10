import type { Metadata } from "next";
import { GlossaryExplorer } from "@/components/explorers/GlossaryExplorer";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { getCategories, listGlossary } from "@/lib/data";
import { absoluteUrl } from "@/lib/site";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = {
  title: "Health glossary",
  description: "Plain-language definitions of the health, nutrition, fitness and medical terms you keep running into.",
  alternates: { canonical: "/glossary" },
};

export default async function GlossaryPage() {
  const [terms, categories] = await Promise.all([listGlossary(), getCategories()]);
  return (
    <PageTransition>
      <main>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "DefinedTermSet",
            name: "Health Maxxing glossary",
            url: absoluteUrl("/glossary"),
            hasDefinedTerm: terms.slice(0, 300).map((t) => ({
              "@type": "DefinedTerm",
              name: t.term,
              description: t.definition,
              url: absoluteUrl(`/glossary#${t.slug}`),
            })),
          }}
        />
        <PageHero
          color="blue"
          eyebrow="Glossary"
          title={
            <>
              The jargon, <span className="serif-accent">translated.</span>
            </>
          }
          lede={`${terms.length} terms from lab reports, gym floors and health headlines, each explained in a sentence or two.`}
          stickers={["chat", "magnifier", "sparkle"]}
          crumbs={[{ href: "/", label: "Home" }, { label: "Glossary" }]}
        />
        <div className="container-hm py-10 md:py-14">
          <GlossaryExplorer terms={terms} categories={categories.map((c) => ({ slug: c.slug, name: c.name, color: c.color }))} />
        </div>
      </main>
    </PageTransition>
  );
}
