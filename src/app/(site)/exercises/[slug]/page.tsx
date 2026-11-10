import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { getExercise, listExercises } from "@/lib/data";
import { EXERCISE_TYPES, LEVEL_LABEL } from "@/lib/labels";
import { absoluteUrl } from "@/lib/site";
import { PageTransition } from "@/components/motion/PageTransition";

type Props = PageProps<"/exercises/[slug]">;

export async function generateStaticParams() {
  const all = await listExercises();
  return (all.length ? all.map((e) => e.slug) : ["__placeholder__"]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const e = await getExercise(slug);
  if (!e) return { title: "Exercise not found", robots: { index: false } };
  return {
    title: `${e.name}: how to do it`,
    description: e.summary,
    alternates: { canonical: `/exercises/${e.slug}` },
  };
}

export default function ExercisePage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <PageTransition variant="skeleton">
          <main className="min-h-[60vh] bg-sand" aria-busy="true" />
        </PageTransition>
      }
    >
      <PageTransition>
        <ExerciseView params={params} />
      </PageTransition>
    </Suspense>
  );
}

async function ExerciseView({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const exercise = await getExercise(slug);
  if (!exercise) notFound();
  const all = await listExercises();
  const type = EXERCISE_TYPES[exercise.type] ?? EXERCISE_TYPES.strength;
  const similar = all
    .filter((e) => e.slug !== exercise.slug)
    .map((e) => ({
      e,
      score: (e.pattern === exercise.pattern ? 4 : 0) + e.primary.filter((m) => exercise.primary.includes(m)).length * 2 + (e.type === exercise.type ? 1 : 0),
    }))
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.e);

  return (
    <main className={`tone-${type.color}`}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: `How to do the ${exercise.name}`,
          description: exercise.summary,
          url: absoluteUrl(`/exercises/${exercise.slug}`),
          tool: exercise.equipment.map((x) => ({ "@type": "HowToTool", name: x })),
          step: exercise.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
        }}
      />
      <header className="bg-tone-soft">
        <div className="container-hm flex items-end gap-6 pb-10 pt-8 md:pb-14 md:pt-12">
          <div className="min-w-0 flex-1">
            <Breadcrumbs className="text-tone-ink" items={[{ href: "/", label: "Home" }, { href: "/exercises", label: "Exercises" }, { label: exercise.name }]} />
            <p className="eyebrow mt-6 text-tone-ink">
              {type.label} · {LEVEL_LABEL[exercise.level] ?? exercise.level}
            </p>
            <h1 className="display display-lg mt-3 text-ink">{exercise.name}</h1>
            <p className="mt-4 max-w-[56ch] text-[clamp(1.0625rem,1.5vw,1.25rem)] leading-[1.5] text-tone-ink">{exercise.summary}</p>
          </div>
          <Sticker name={type.sticker} size={140} rotate={8} className="hidden flex-none md:block" />
        </div>
      </header>

      <div className="container-hm grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,700px)_1fr] lg:gap-14">
        <div>
          <h2 className="display display-sm">
            How to <span className="serif-accent">do it</span>
          </h2>
          <ol className="mt-6 space-y-4">
            {exercise.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex size-10 flex-none items-center justify-center rounded-full border-[1.5px] border-ink bg-tone-soft text-lg font-semibold tabular-nums">{i + 1}</span>
                <p className="pt-1.5 text-[1.0625rem] leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <section className="rounded-[22px] bg-[var(--lime-soft)] p-5 text-[var(--lime-ink)]">
              <h2 className="eyebrow">Coaching cues</h2>
              <ul className="mt-3 space-y-2.5">
                {exercise.cues.map((cue) => (
                  <li key={cue} className="flex gap-2.5 text-[0.9375rem] font-medium leading-snug">
                    <Icon name="check" size={18} strokeWidth={3} className="mt-0.5 flex-none" />
                    {cue}
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-[22px] bg-[var(--yellow-soft)] p-5 text-[var(--yellow-ink)]">
              <h2 className="eyebrow">Common mistakes</h2>
              <ul className="mt-3 space-y-2.5">
                {exercise.mistakes.map((m) => (
                  <li key={m} className="flex gap-2.5 text-[0.9375rem] font-medium leading-snug">
                    <Icon name="close" size={18} strokeWidth={3} className="mt-0.5 flex-none" />
                    {m}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {(exercise.easier || exercise.harder) && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {exercise.easier && (
                <section className="rounded-[22px] border-[1.5px] border-line-strong p-5">
                  <h2 className="eyebrow text-ink-3">Make it easier</h2>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed">{exercise.easier}</p>
                </section>
              )}
              {exercise.harder && (
                <section className="rounded-[22px] border-[1.5px] border-line-strong p-5">
                  <h2 className="eyebrow text-ink-3">Make it harder</h2>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed">{exercise.harder}</p>
                </section>
              )}
            </div>
          )}

          <p className="mt-10 rounded-2xl bg-sand p-5 text-sm leading-relaxed text-ink-2">
            Technique descriptions are general guidance. If something hurts (sharp pain, not effort), stop. People with injuries or medical
            conditions should check with a health professional or a qualified coach first.
          </p>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[24px] border-[1.5px] border-ink p-5">
            <h2 className="eyebrow text-ink-3">At a glance</h2>
            <dl className="mt-4 space-y-4 text-[0.9375rem]">
              <div>
                <dt className="text-ink-3">Main muscles</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {exercise.primary.map((m) => (
                    <span key={m} className="chip">{m}</span>
                  ))}
                </dd>
              </div>
              {exercise.secondary.length > 0 && (
                <div>
                  <dt className="text-ink-3">Also working</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {exercise.secondary.map((m) => (
                      <span key={m} className="chip chip-outline">{m}</span>
                    ))}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                <dt className="text-ink-3">Equipment</dt>
                <dd className="text-right font-semibold capitalize">{exercise.equipment.join(", ")}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-3">Movement</dt>
                <dd className="font-semibold capitalize">{exercise.pattern}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-3">Level</dt>
                <dd className="font-semibold">{LEVEL_LABEL[exercise.level] ?? exercise.level}</dd>
              </div>
            </dl>
          </section>

          {similar.length > 0 && (
            <section>
              <h2 className="eyebrow text-ink-3">Similar exercises</h2>
              <ul className="mt-3 space-y-1.5">
                {similar.map((e) => (
                  <li key={e.slug}>
                    <Link href={`/exercises/${e.slug}`} className={cn("flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-[0.9375rem] font-semibold transition-colors hover:border-ink hover:bg-tone-soft")}>
                      {e.name}
                      <Icon name="arrow-right" size={15} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
