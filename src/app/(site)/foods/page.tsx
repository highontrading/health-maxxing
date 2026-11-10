import type { Metadata } from "next";
import { FoodExplorer } from "@/components/explorers/FoodExplorer";
import { PageHero } from "@/components/PageHero";
import { listFoods } from "@/lib/data";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = {
  title: "Food database",
  description: "Calories, protein, carbs, fiber and fat for common foods, per 100 g and per serving. Sort to find the most protein or fiber.",
  alternates: { canonical: "/foods" },
};

export default async function FoodsPage() {
  const foods = await listFoods();
  return (
    <PageTransition>
      <main>
        <PageHero
          color="lime"
          eyebrow="Food database"
          title={
            <>
              What is actually <span className="serif-accent">in your food.</span>
            </>
          }
          lede={`Nutrient values for ${foods.length} everyday foods. Sort by protein, fiber or calories and switch between 100 g and a typical serving.`}
          stickers={["avocado", "egg", "broccoli"]}
          crumbs={[{ href: "/", label: "Home" }, { label: "Foods" }]}
        />
        <div className="container-hm py-10 md:py-14">
          <FoodExplorer foods={foods} />
          <p className="mt-10 rounded-2xl bg-sand p-5 text-sm leading-relaxed text-ink-2">
            Values are rounded reference figures based on USDA FoodData Central. Real foods vary with variety, ripeness, brand and cooking method,
            so treat the numbers as good estimates rather than exact measurements.
          </p>
        </div>
      </main>
    </PageTransition>
  );
}
