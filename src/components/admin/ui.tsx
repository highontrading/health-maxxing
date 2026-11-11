import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";

/** Page title row with optional actions on the right. */
export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-ink-3 transition-colors duration-(--dur-fast) hover:text-ink">
          <Icon name="arrow-left" size={14} /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="display display-md">{title}</h1>
          {description && <p className="mt-1.5 max-w-[70ch] text-ink-2">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

type Query = Record<string, string | string[] | undefined>;
export const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

/** The result of the last action, passed back through ?notice= or ?error=. */
export function Notice({ query }: { query: Query }) {
  const error = one(query.error);
  const notice = one(query.notice);
  if (!error && !notice) return null;
  return (
    <p
      // Keyed by its words: a different result is a new banner and rises in again, instead of the text changing in place.
      key={error || notice}
      role={error ? "alert" : "status"}
      className={cn(
        "admin-banner mb-5 flex items-start gap-2 rounded-2xl px-4 py-3 text-[0.9375rem] font-medium",
        error ? "bg-[var(--pink-soft)] text-[var(--pink-ink)]" : "bg-[var(--lime-soft)] text-[var(--lime-ink)]",
      )}
    >
      <Icon name={error ? "alert" : "check"} size={18} className="mt-0.5 flex-none" />
      {(error || notice).slice(0, 400)}
    </p>
  );
}

export function Card({ title, action, children, className, flush }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cn("admin-card", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <h2 className="text-[1.0625rem] font-semibold">{title}</h2>
          {action}
        </div>
      )}
      <div className={flush ? "pt-2" : "p-5"}>{children}</div>
    </section>
  );
}

export function StatusBadge({ status, publishedAt, scheduled }: { status: string; publishedAt?: string | null; scheduled?: boolean }) {
  if (status !== "published") return <span className="badge badge-gray">Draft</span>;
  if (scheduled && publishedAt) return <span className="badge badge-blue">Scheduled</span>;
  return <span className="badge badge-green">Published</span>;
}

export function FactBadge({ state }: { state?: string }) {
  if (state === "verified") {
    return (
      <span className="badge badge-green">
        <Icon name="check" size={12} /> Verified
      </span>
    );
  }
  return (
    <span className="badge badge-yellow">
      <Icon name="clock" size={12} /> Pending
    </span>
  );
}

/** Filter pills that keep the other query parameters. */
export function FilterTabs({ base, query, name, tabs }: { base: string; query: Query; name: string; tabs: { value: string; label: string; count?: number }[] }) {
  const current = one(query[name]);
  const href = (value: string) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      const s = one(v);
      if (s && k !== name && k !== "page" && k !== "notice" && k !== "error") params.set(k, s);
    }
    if (value) params.set(name, value);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((t) => (
        <Link key={t.value || "all"} href={href(t.value)} className={cn("chip admin-filter-chip", current === t.value ? "chip-active" : "chip-outline")} aria-current={current === t.value ? "true" : undefined}>
          {t.label}
          {t.count !== undefined && <span className="tabular-nums opacity-70">{t.count.toLocaleString("en-US")}</span>}
        </Link>
      ))}
    </div>
  );
}

export function Pager({ base, query, page, pages }: { base: string; query: Query; page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      const s = one(v);
      if (s && k !== "page" && k !== "notice" && k !== "error") params.set(k, s);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };
  return (
    <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-3 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-outline btn-sm">
          <Icon name="arrow-left" size={14} /> Newer
        </Link>
      ) : (
        <span />
      )}
      <span className="text-ink-3">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className="btn btn-outline btn-sm">
          Next <Icon name="arrow-right" size={14} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function EmptyState({ sticker = "magnifier", title, children }: { sticker?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <Sticker name={sticker} size={72} rotate={-8} />
      <p className="mt-4 text-lg font-semibold">{title}</p>
      {children && <div className="mt-1 max-w-md text-ink-2">{children}</div>}
    </div>
  );
}

/** "12 Mar 2026, 14:05" in UTC, from an ISO string. Deterministic: no clock, no locale. */
export function stamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function day(iso: string | null | undefined): string {
  return stamp(iso).split(",")[0];
}
