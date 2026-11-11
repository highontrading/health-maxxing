import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PageHero } from "@/components/PageHero";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { TOOLS } from "@/lib/tools";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = {
  title: "Health calculators",
  description: "Free calculators for BMI, calorie needs, protein, heart rate zones, body fat, sleep cycles, blood pressure and more.",
  alternates: { canonical: "/tools" },
};

export default function ToolsPage() {
  return (
    <PageTransition>
      <main>
        <PageHero
          color="yellow"
          eyebrow="Calculators"
          title={
            <>
              Numbers that <span className="serif-accent">mean something.</span>
            </>
          }
          lede={`${TOOLS.length} free tools built on published formulas. Each one shows its working, cites its source and tells you what the result cannot say.`}
          stickers={["tape", "stopwatch", "scale"]}
          crumbs={[{ href: "/", label: "Home" }, { label: "Tools" }]}
        />
        <div className="container-hm py-10 md:py-14">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Cards below the fold rise in as they are scrolled to; a row arriving together cascades (RevealObserver).
                Hover and press: .tool-card in styles/motion/tools.css. */}
            {TOOLS.map((t, i) => (
              <li key={t.slug} className="tool-card-slot reveal">
                <Link
                  href={`/tools/${t.slug}`}
                  className={cn(`tone-${t.color}`, "tool-card relative flex h-full min-h-[200px] flex-col overflow-hidden rounded-[26px] bg-tone-soft p-6 text-tone-ink")}
                >
                  <span className="flex items-start justify-between">
                    <Sticker name={t.sticker} size={64} rotate={i % 2 ? 8 : -8} />
                    <span className="tool-card-arrow flex size-10 items-center justify-center rounded-full border-[1.5px] border-ink">
                      <Icon name="arrow-up-right" size={18} />
                    </span>
                  </span>
                  <h2 className="mt-auto pt-6 text-[1.5rem] font-medium leading-tight tracking-[-0.025em] text-ink">{t.name}</h2>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed opacity-90">{t.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-12 rounded-2xl bg-sand p-5 text-sm leading-relaxed text-ink-2">
            These calculators give estimates for healthy adults and are for information only. They do not replace measurements or advice from a
            health professional, and they are not designed for children, pregnancy (except the due date tool) or medical conditions.
          </p>
        </div>
      </main>
    </PageTransition>
  );
}
