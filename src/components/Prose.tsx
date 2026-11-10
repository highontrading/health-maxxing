import { cn } from "@/lib/cn";

/** Renders sanitized HTML from lib/markdown.ts with the house typography. */
export function Prose({ html, compact = false, className, id }: { html: string; compact?: boolean; className?: string; id?: string }) {
  return <div id={id} data-prose className={cn("prose-hm", compact && "prose-compact", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
