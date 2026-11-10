/**
 * Cache invalidation. Every cached reader in lib/data.ts is tagged with the
 * collection it reads; mutations call one of these with the same names.
 */
import "server-only";
import { revalidateTag, updateTag } from "next/cache";

export const CONTENT_TAGS = [
  "articles",
  "conditions",
  "glossary",
  "myths",
  "foods",
  "exercises",
  "categories",
  "body-systems",
  "pages",
  "newsletter",
  "settings",
  "forum-boards",
] as const;
export type ContentTag = (typeof CONTENT_TAGS)[number];

/** Inside a Server Action: the next read sees the change immediately. */
export function invalidate(...tags: ContentTag[]): void {
  for (const tag of tags) updateTag(tag);
}

/** Inside a Route Handler (API, cron): expire now, rebuild on the next request. */
export function invalidateFromRoute(...tags: ContentTag[]): void {
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
}
