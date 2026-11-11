import type { Metadata } from "next";
import Link from "next/link";
import { ExerciseExplorer } from "@/components/explorers/ExerciseExplorer";
import { Icon } from "@/components/Icon";
import { PageHero } from "@/components/PageHero";
import { listExercises } from "@/lib/data";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = {
  title: "Exercise library",
  description: "Clear, step-by-step instructions for strength, core, cardio, mobility and balance exercises, with form cues and common mistakes.",
  alternates: { canonical: "/exercises" },
};

export default async function ExercisesPage() {
  const exercises = await listExercises();
  return (
    <PageTransition>
      <main>
        <PageHero
          color="orange"
          eyebrow="Exercise library"
          title={
            <>
              Every move, <span className="serif-accent">explained properly.</span>
            </>
          }
          lede={`${exercises.length} exercises with step-by-step instructions, the cues a good coach would give you and the mistakes to avoid.`}
          stickers={["dumbbell", "kettlebell", "sneaker"]}
          crumbs={[{ href: "/", label: "Home" }, { label: "Exercises" }]}
        >
          <Link href="/articles/strength-training-for-beginners" className="btn btn-primary">
            New to lifting? Start here <Icon name="arrow-right" size={16} className="nudge-x" />
          </Link>
        </PageHero>
        <div className="container-hm py-10 md:py-14">
          <ExerciseExplorer exercises={exercises} />
          <p className="mt-12 rounded-2xl bg-sand p-5 text-sm leading-relaxed text-ink-2">
            Start lighter than you think you need to and build up gradually. If you have an injury, a heart condition, are pregnant or have not
            exercised in a long time, check with a health professional before starting a new program. Stop if you feel sharp pain, chest pain or
            dizziness.
          </p>
        </div>
      </main>
    </PageTransition>
  );
}
