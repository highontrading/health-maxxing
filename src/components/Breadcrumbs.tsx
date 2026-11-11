import Link from "next/link";
import { cn } from "@/lib/cn";

export type Crumb = { href?: string; label: string };

/** Breadcrumbs lead back up the site, so the page change leans that way (see PageTransition). */
const UP = ["nav-back"];

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-[0.8125rem] font-medium", className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true" className="opacity-40">/</span>}
            {item.href ? (
              <Link href={item.href} transitionTypes={UP} className="link-draw breadcrumb-link opacity-70 hover:opacity-100 focus-visible:opacity-100">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="opacity-100">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
