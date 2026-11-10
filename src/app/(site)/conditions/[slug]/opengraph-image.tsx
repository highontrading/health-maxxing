import { getBodySystems, getCondition } from "@/lib/data";
import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "Health Maxxing condition guide";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [condition, systems] = await Promise.all([getCondition(slug), getBodySystems()]);
  const system = systems.find((s) => s.slug === condition?.system);
  return ogImage({ title: condition?.name ?? "Health Maxxing", label: "Condition guide", color: system?.color });
}
