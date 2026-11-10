import { getArticle, getCategories } from "@/lib/data";
import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "Health Maxxing article";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article, categories] = await Promise.all([getArticle(slug), getCategories()]);
  const category = categories.find((c) => c.slug === article?.category);
  return ogImage({ title: article?.title ?? "Health Maxxing", label: category?.name, color: category?.color });
}
