import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FoodSkeleton } from "@/components/article/Skeletons";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Icon } from "@/components/Icon";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { getFood, listFoods } from "@/lib/data";
import { FOOD_GROUPS } from "@/lib/labels";
import type { Food } from "@/lib/types";
import { PageTransition } from "@/components/motion/PageTransition";

type Props = PageProps<"/foods/[slug]">;

export async function generateStaticParams() {
  const all = await listFoods();
  return (all.length ? all.map((f) => f.slug) : ["__placeholder__"]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const f = await getFood(slug);
  if (!f) return { title: "Food not found", robots: { index: false } };
  return {
    title: `${f.name}: calories and nutrition facts`,
    description: `${f.name} has ${Math.round(f.kcal)} kcal, ${f.protein} g protein, ${f.carbs} g carbohydrate and ${f.fat} g fat per 100 g. ${f.note}`,
    alternates: { canonical: `/foods/${f.slug}` },
  };
}

export default function FoodPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <PageTransition variant="skeleton">
          <FoodSkeleton />
        </PageTransition>
      }
    >
      <PageTransition>
        <FoodView params={params} />
      </PageTransition>
    </Suspense>
  );
}

const n = (v: number, dp = 1) => (dp === 0 ? String(Math.round(v)) : (Math.round(v * 10 ** dp) / 10 ** dp).toString());

function Row({ label, per100, perServing, unit, indent, strong }: { label: string; per100: number; perServing: number; unit: string; indent?: boolean; strong?: boolean }) {
  const dp = unit === "g" ? 1 : 0;
  return (
    <tr className="border-t border-ink/15">
      <th scope="row" className={cn("py-2 text-left", indent ? "pl-5 font-normal text-ink-2" : "font-semibold", strong && "text-lg")}>
        {label}
      </th>
      <td className={cn("py-2 text-right tabular-nums", strong && "text-lg font-semibold")}>
        {n(per100, dp)} {unit}
      </td>
      <td className={cn("py-2 text-right tabular-nums", strong && "text-lg font-semibold")}>
        {n(perServing, dp)} {unit}
      </td>
    </tr>
  );
}

async function FoodView({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const food = await getFood(slug);
  if (!food) notFound();
  const all = await listFoods();
  const group = FOOD_GROUPS[food.group] ?? FOOD_GROUPS.vegetables;
  const k = food.servingGrams / 100;
  const macroKcal = { protein: food.protein * 4, carbs: food.carbs * 4, fat: food.fat * 9 };
  const total = macroKcal.protein + macroKcal.carbs + macroKcal.fat || 1;
  const bars = [
    { name: "Protein", pct: (macroKcal.protein / total) * 100, color: "var(--pink-solid)" },
    { name: "Carbs", pct: (macroKcal.carbs / total) * 100, color: "var(--yellow-solid)" },
    { name: "Fat", pct: (macroKcal.fat / total) * 100, color: "var(--blue-solid)" },
  ];
  const peers: Food[] = all.filter((f) => f.group === food.group && f.slug !== food.slug).slice(0, 8);

  return (
    <main className={`tone-${group.color}`}>
      <header className="bg-tone-soft">
        <div className="container-hm flex items-end gap-6 pb-10 pt-8 md:pb-14 md:pt-12">
          <div className="min-w-0 flex-1">
            <Breadcrumbs className="text-tone-ink" items={[{ href: "/", label: "Home" }, { href: "/foods", label: "Foods" }, { label: food.name }]} />
            <p className="eyebrow mt-6 text-tone-ink">{group.label}</p>
            <h1 className="display display-lg mt-3 text-ink">{food.name}</h1>
            <p className="mt-4 max-w-[56ch] text-[clamp(1.0625rem,1.5vw,1.25rem)] leading-[1.5] text-tone-ink">{food.note}</p>
          </div>
          <Sticker name={group.sticker} size={140} rotate={8} className="enter-pop hidden flex-none md:block" />
        </div>
      </header>

      <div className="container-hm grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,560px)_1fr] lg:gap-14">
        <section aria-labelledby="facts-heading" className="rounded-[26px] border-[1.5px] border-ink bg-paper p-6 shadow-[0_8px_0_var(--ink)]">
          <h2 id="facts-heading" className="text-[1.75rem] font-semibold leading-none tracking-[-0.03em]">
            Nutrition facts
          </h2>
          <p className="mt-2 text-sm text-ink-3">
            Typical serving: {food.servingLabel} ({n(food.servingGrams, 0)} g)
          </p>
          <div className="mt-4 h-2 rounded-full bg-ink" />
          <table className="mt-1 w-full text-[0.9375rem]">
            <thead>
              <tr className="text-xs text-ink-3">
                <th className="py-2 text-left font-semibold" />
                <th scope="col" className="py-2 text-right font-semibold">Per 100 g</th>
                <th scope="col" className="py-2 text-right font-semibold">Per serving</th>
              </tr>
            </thead>
            <tbody>
              <Row label="Calories" per100={food.kcal} perServing={food.kcal * k} unit="kcal" strong />
              <Row label="Protein" per100={food.protein} perServing={food.protein * k} unit="g" />
              <Row label="Carbohydrate" per100={food.carbs} perServing={food.carbs * k} unit="g" />
              <Row label="Fiber" per100={food.fiber} perServing={food.fiber * k} unit="g" indent />
              <Row label="Sugars" per100={food.sugars} perServing={food.sugars * k} unit="g" indent />
              <Row label="Fat" per100={food.fat} perServing={food.fat * k} unit="g" />
              <Row label="Saturated fat" per100={food.satFat} perServing={food.satFat * k} unit="g" indent />
              <Row label="Sodium" per100={food.sodiumMg} perServing={food.sodiumMg * k} unit="mg" />
            </tbody>
          </table>
          {food.micros.length > 0 && (
            <>
              <div className="mt-3 h-1 rounded-full bg-ink" />
              <h3 className="eyebrow mt-4 text-ink-3">Notable for (per 100 g)</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {food.micros.map((m) => (
                  <li key={m.name} className="chip">
                    {m.name}: {m.amount} {m.unit}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <div className="space-y-8">
          <section>
            <h2 className="display display-sm">
              Where the calories <span className="serif-accent">come from</span>
            </h2>
            <div className="mt-5 h-6 overflow-hidden rounded-full border-[1.5px] border-ink" aria-hidden="true">
              {/* Fills from the left when it scrolls into view (.food-macro-fill in reading.css); the figures are in the list below. */}
              <div className="reveal food-macro-fill flex h-full">
                {bars.map((b) => (
                  <div key={b.name} style={{ width: `${b.pct}%`, background: b.color }} />
                ))}
              </div>
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[0.9375rem] font-medium">
              {bars.map((b) => (
                <li key={b.name} className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ background: b.color }} />
                  {b.name} {Math.round(b.pct)}%
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[22px] bg-sand p-5">
            <h2 className="eyebrow text-ink-3">Put it to work</h2>
            <ul className="mt-3 space-y-2 text-[0.9375rem] font-semibold">
              <li>
                <Link href="/tools/macros" className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
                  Work out your daily macros <Icon name="arrow-right" size={15} className="nudge-x" />
                </Link>
              </li>
              <li>
                <Link href="/articles/how-much-protein-do-you-need" className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
                  How much protein you actually need <Icon name="arrow-right" size={15} className="nudge-x" />
                </Link>
              </li>
              <li>
                <Link href="/articles/how-to-read-a-nutrition-label" className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
                  How to read a nutrition label <Icon name="arrow-right" size={15} className="nudge-x" />
                </Link>
              </li>
            </ul>
          </section>

          {peers.length > 0 && (
            <section>
              <h2 className="eyebrow text-ink-3">More {group.label.toLowerCase()}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {peers.map((f) => (
                  <li key={f.slug}>
                    <Link href={`/foods/${f.slug}`} className="reading-link-pill inline-flex rounded-full border-[1.5px] border-line-strong px-3.5 py-1.5 text-sm font-semibold hover:border-ink hover:bg-tone-soft">
                      {f.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-sm leading-relaxed text-ink-3">
            Rounded reference values based on USDA FoodData Central
            {food.fdcId ? (
              <>
                {" "}
                (
                <a href={`https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  FDC {food.fdcId}
                </a>
                )
              </>
            ) : null}
            . Actual values vary with variety, brand and preparation.
          </p>
        </div>
      </div>
    </main>
  );
}
