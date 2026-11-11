import type { Metadata } from "next";
import Link from "next/link";
import { ConditionExplorer } from "@/components/explorers/ConditionExplorer";
import { Icon } from "@/components/Icon";
import { PageHero } from "@/components/PageHero";
import { getBodySystems, listConditions } from "@/lib/data";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = {
  title: "Conditions A to Z",
  description: "Plain-language pages on common health conditions: symptoms, causes, diagnosis, treatment and when to see a doctor.",
  alternates: { canonical: "/conditions" },
};

export default async function ConditionsPage() {
  const [conditions, systems] = await Promise.all([listConditions(), getBodySystems()]);
  return (
    <PageTransition>
      <main>
        <PageHero
          color="pink"
          eyebrow="Conditions A to Z"
          title={
            <>
              Look it up <span className="serif-accent">without the panic.</span>
            </>
          }
          lede={`${conditions.length} conditions explained calmly: what it is, how it feels, what causes it, how it is treated and when to get help.`}
          stickers={["stethoscope", "bandage", "thermometer"]}
          crumbs={[{ href: "/", label: "Home" }, { label: "Conditions" }]}
        >
          <Link href="/body" className="btn btn-primary">
            Browse by body part <Icon name="arrow-right" size={16} className="nudge-x" />
          </Link>
        </PageHero>
        <div className="container-hm py-10 md:py-14">
          <ConditionExplorer conditions={conditions} systems={systems.map((s) => ({ slug: s.slug, name: s.name, color: s.color, sticker: s.sticker }))} />
          <p className="mt-14 rounded-2xl bg-sand p-5 text-sm leading-relaxed text-ink-2">
            These pages are general information. They cannot diagnose you. If symptoms are severe, sudden or worrying you, contact a health
            professional, and in an emergency call your local emergency number.
          </p>
        </div>
      </main>
    </PageTransition>
  );
}
