import type { Metadata } from "next";
import Link from "next/link";
import { BodyMap } from "@/components/BodyMap";
import { Icon } from "@/components/Icon";
import { PageHero } from "@/components/PageHero";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { getBodySystems } from "@/lib/data";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = {
  title: "Body map",
  description: "Explore health conditions by body system, from the brain and heart to digestion, hormones, skin and joints.",
  alternates: { canonical: "/body" },
};

export default async function BodyPage() {
  const systems = await getBodySystems();
  const total = systems.reduce((sum, s) => sum + s.conditionCount, 0);
  return (
    <PageTransition>
      <main>
        <PageHero
          color="blue"
          eyebrow="The body map"
          title={
            <>
              Thirteen systems. <span className="serif-accent">One you.</span>
            </>
          }
          lede={`Pick the part of the body you are wondering about to see the ${total} conditions we cover there, with related guides.`}
          crumbs={[{ href: "/", label: "Home" }, { label: "Body map" }]}
        />
        <div className="container-hm py-10 md:py-14">
          <div className="hidden rounded-[30px] bg-sand p-6 md:block lg:p-10">
            <BodyMap systems={systems.map((s) => ({ slug: s.slug, name: s.name, sticker: s.sticker, color: s.color, conditionCount: s.conditionCount }))} />
          </div>

          <h2 className="display display-sm mt-4 md:mt-14">
            All systems, <span className="serif-accent">head to toe</span>
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {systems.map((s, i) => (
              <li key={s.slug} className="reveal" style={{ transitionDelay: `${(i % 3) * 40}ms` }}>
                <Link href={`/body/${s.slug}`} className={cn(`tone-${s.color}`, "group flex h-full flex-col rounded-[24px] bg-tone-soft p-5 text-tone-ink transition-transform duration-300 hover:-translate-y-1")}>
                  <span className="flex items-start justify-between gap-3">
                    <Sticker name={s.sticker} size={64} rotate={i % 2 ? 8 : -8} className="transition-transform duration-300 group-hover:scale-110" />
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink">
                      {s.conditionCount} {s.conditionCount === 1 ? "condition" : "conditions"}
                    </span>
                  </span>
                  <span className="mt-4 text-[1.375rem] font-medium leading-tight tracking-[-0.02em] text-ink">{s.name}</span>
                  <span className="mt-2 text-[0.9375rem] leading-relaxed opacity-90">{s.description}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold">
                    Explore <Icon name="arrow-right" size={16} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </PageTransition>
  );
}
