import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, day, Notice, one, PageHeader, stamp } from "@/components/admin/ui";
import { ViewsChart } from "@/components/admin/ViewsChart";
import { Icon } from "@/components/Icon";
import { recentActivity } from "@/lib/activity";
import { getDashboard, getNavCounts } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/auth";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Dashboard" };

const RANGES = [7, 30, 90];
const fmt = (v: number) => v.toLocaleString("en-US");
/** 1,284 / 12.9K / 4.2M, for big standalone figures. */
const compact = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 10_000 ? `${(v / 1000).toFixed(1)}K` : fmt(v));

function Tile({ label, value, note, href }: { label: string; value: number; note?: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-sm font-medium text-ink-2">{label}</p>
      <p className="mt-1 text-[1.75rem] font-semibold leading-none tracking-[-0.02em]">{compact(value)}</p>
      {note && <p className="mt-1.5 text-sm text-ink-3">{note}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="admin-card block p-4 transition-colors hover:border-ink-3">
      {body}
    </Link>
  ) : (
    <div className="admin-card p-4">{body}</div>
  );
}

/** Change against the period before. More is better for everything shown here. */
function Delta({ current, previous, days }: { current: number; previous: number; days: number }) {
  const period = `the ${days} days before`;
  if (!previous) return <p className="mt-1.5 text-sm text-ink-3">{current ? `None in ${period}` : `Same as ${period}`}</p>;
  const pct = Math.round(((current - previous) / previous) * 100);
  const tone = pct > 0 ? "var(--viz-up)" : pct < 0 ? "var(--viz-down)" : "var(--ink-3)";
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-1 text-sm">
      <span className="inline-flex items-center gap-0.5 font-semibold" style={{ color: tone }}>
        <Icon name={pct > 0 ? "arrow-up-right" : pct < 0 ? "arrow-down" : "minus"} size={14} />
        {pct > 0 ? "+" : pct < 0 ? "−" : ""}
        {Math.abs(pct)}%
      </span>
      <span className="text-ink-3">vs {period}</span>
    </p>
  );
}

/** Ranked bars: one colour, bars on one baseline, the figure beside each name. */
function RankedBars({ rows, unit }: { rows: { key: string; label: string; value: number; href?: string }[]; unit: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="space-y-3">
      {rows.map((r) => {
        const inner = (
          <>
            <span className="flex items-baseline justify-between gap-3 text-sm">
              <span className={cn("truncate font-medium", r.href && "underline-offset-4 group-hover:underline")}>{r.label}</span>
              <span className="flex-none tabular-nums text-ink-2">{fmt(r.value)}</span>
            </span>
            <span className="mt-1.5 block h-2">
              <span className="block h-2 rounded-r-[4px] bg-[var(--viz-series)]" style={{ width: r.value ? `max(4px, ${(r.value / max) * 100}%)` : 0 }} />
            </span>
          </>
        );
        const title = `${r.label}: ${fmt(r.value)} ${unit}`;
        return (
          <li key={r.key}>
            {r.href ? (
              <Link href={r.href} target="_blank" title={title} className="group block">
                {inner}
              </Link>
            ) : (
              <span title={title} className="block">
                {inner}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Todo({ href, icon, label, count, quiet }: { href: string; icon: string; label: string; count: number; quiet: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-sand">
        <span className={cn("flex size-9 flex-none items-center justify-center rounded-full", count ? "bg-[var(--pink-soft)] text-[var(--pink-ink)]" : "bg-sand-2 text-ink-3")}>
          <Icon name={count ? icon : "check"} size={18} />
        </span>
        <span className="min-w-0 flex-1 text-[0.9375rem]">
          <span className="font-medium">{count ? `${fmt(count)} ${label}` : quiet}</span>
        </span>
        <Icon name="chevron-right" size={16} className="text-ink-3" />
      </Link>
    </li>
  );
}

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const user = await requireStaff();
  const query = await searchParams;
  const requested = Number(one(query.range));
  const range = RANGES.includes(requested) ? requested : 30;
  const [data, counts, activity] = await Promise.all([getDashboard(range), getNavCounts(), recentActivity(7)]);
  const pendingFacts = data.factCheck.reduce((sum, f) => sum + (f.total - f.verified), 0);

  return (
    <div className="viz-root">
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0]}.`}
        description="What needs you, what is published, and how the site is doing."
        actions={
          <>
            <Link href="/admin/c/articles/new" className="btn btn-primary">
              <Icon name="plus" size={16} /> New article
            </Link>
            {user.role === "admin" && (
              <Link href="/admin/autopilot" className="btn btn-outline">
                <Icon name="bot" size={16} /> Autopilot
              </Link>
            )}
          </>
        }
      />
      <Notice query={query} />
      {one(query.denied) && (
        <p role="alert" className="mb-5 rounded-2xl bg-[var(--yellow-soft)] px-4 py-3 text-[0.9375rem] font-medium text-[var(--yellow-ink)]">
          That page is for admins only.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Tile label="Articles published" value={data.totals.articles} note={data.totals.drafts ? `${fmt(data.totals.drafts)} in drafts` : "No drafts"} href="/admin/c/articles" />
        <Tile label="Conditions" value={data.totals.conditions} href="/admin/c/conditions" />
        <Tile label="Members" value={data.totals.members} href="/admin/users" />
        <Tile label="Newsletter subscribers" value={data.totals.subscribers} href="/admin/subscribers" />
        <Tile label="Forum threads" value={data.totals.threads} note={`${fmt(data.totals.replies)} replies`} href="/admin/community" />
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Everything in this column follows the range chosen in its first row. */}
        <section aria-labelledby="traffic-title" className="order-last min-w-0 space-y-5 xl:order-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="traffic-title" className="text-[1.25rem] font-semibold">
              Traffic and growth
            </h2>
            <div className="flex rounded-full bg-sand-2 p-1" role="group" aria-label="Time range">
              {RANGES.map((r) => (
                <Link
                  key={r}
                  href={r === 30 ? "/admin" : `/admin?range=${r}`}
                  scroll={false}
                  aria-current={r === range ? "true" : undefined}
                  className={cn("rounded-full px-3.5 py-1.5 text-sm font-semibold", r === range ? "bg-paper shadow-sm" : "text-ink-2 hover:text-ink")}
                >
                  {r} days
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="admin-card p-5">
              <p className="text-sm font-medium text-ink-2">Page views</p>
              <p className="mt-1 text-[3.25rem] font-semibold leading-none tracking-[-0.03em]">{compact(data.views.total)}</p>
              <Delta current={data.views.total} previous={data.views.previous} days={range} />
            </div>
            <div className="admin-card p-5">
              <p className="text-sm font-medium text-ink-2">New members</p>
              <p className="mt-1 text-[1.75rem] font-semibold leading-none tracking-[-0.02em]">{compact(data.members.added)}</p>
              <Delta current={data.members.added} previous={data.members.previous} days={range} />
            </div>
            <div className="admin-card p-5">
              <p className="text-sm font-medium text-ink-2">New subscribers</p>
              <p className="mt-1 text-[1.75rem] font-semibold leading-none tracking-[-0.02em]">{compact(data.subscribers.added)}</p>
              <Delta current={data.subscribers.added} previous={data.subscribers.previous} days={range} />
            </div>
          </div>

          <div className="admin-card p-5">
            <ViewsChart series={data.views.series} />
          </div>

          <Card title={`Most read, last ${range} days`}>
            {data.top.length ? (
              <RankedBars
                unit="views"
                rows={data.top.map((t) => ({
                  key: `${t.kind}:${t.slug}`,
                  label: t.title,
                  value: t.views,
                  href: `/${t.kind === "article" ? "articles" : "conditions"}/${t.slug}`,
                }))}
              />
            ) : (
              <p className="text-sm text-ink-3">Nothing has been read in this period yet.</p>
            )}
          </Card>
        </section>

        <div className="space-y-5">
          <Card title="Needs you">
            <ul className="-mx-2 -my-1">
              <Todo href="/admin/community" icon="flag" label={counts.openReports === 1 ? "report to review" : "reports to review"} count={counts.openReports} quiet="No open reports" />
              <Todo href="/admin/messages" icon="message" label={counts.newMessages === 1 ? "new message" : "new messages"} count={counts.newMessages} quiet="No new messages" />
              <Todo href="/admin/c/articles?status=draft" icon="edit" label={data.totals.drafts === 1 ? "draft to finish" : "drafts to finish"} count={data.totals.drafts} quiet="No drafts waiting" />
              <Todo href="/admin/c/articles?fact=pending" icon="clock" label={pendingFacts === 1 ? "page awaiting a fact check" : "pages awaiting a fact check"} count={pendingFacts} quiet="Every page is fact-checked" />
            </ul>
          </Card>

          <Card title="Fact-check coverage">
            <ul className="space-y-4">
              {data.factCheck.map((f) => {
                const pct = f.total ? Math.round((f.verified / f.total) * 100) : 0;
                return (
                  <li key={f.label}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium">{f.label}</span>
                      <span className="tabular-nums text-ink-2">
                        {fmt(f.verified)} of {fmt(f.total)} verified
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--viz-track)]"
                      role="meter"
                      aria-label={`${f.label} verified`}
                      aria-valuemin={0}
                      aria-valuemax={f.total}
                      aria-valuenow={f.verified}
                      aria-valuetext={`${f.verified} of ${f.total} verified, ${pct}%`}
                    >
                      <div className="h-2 rounded-full bg-[var(--viz-series)]" style={{ width: f.verified ? `max(8px, ${pct}%)` : 0 }} />
                    </div>
                    <Link href={f.href} className="mt-1.5 inline-block text-sm font-medium text-ink-2 underline underline-offset-4 hover:text-ink">
                      Review the {fmt(f.total - f.verified)} pending
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 border-t border-line pt-3 text-sm text-ink-3">
              Pending pages were written from established knowledge and still need a line-by-line source check. The list of claims to check is in
              <code className="mx-1 rounded bg-sand-2 px-1 py-0.5 text-[0.8125rem]">content/FACT_CHECK_QUEUE.md</code>.
            </p>
          </Card>

          {data.drafts.length > 0 && (
            <Card title="Latest drafts" action={<Link href="/admin/c/articles?status=draft" className="text-sm font-medium underline underline-offset-4">All drafts</Link>}>
              <ul className="space-y-2.5">
                {data.drafts.map((d) => (
                  <li key={d.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <Link href={`/admin/c/articles/${d.id}`} className="min-w-0 truncate font-medium underline-offset-4 hover:underline">
                      {d.title}
                    </Link>
                    <span className="flex-none text-ink-3">{d.origin === "autopilot" ? "Autopilot · " : ""}{day(d.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Recent activity" action={<Link href="/admin/activity" className="text-sm font-medium underline underline-offset-4">Full log</Link>}>
            {activity.length ? (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="text-sm leading-snug">
                    <span className="font-medium">{a.actor.replace(/ \(@.*\)$/, "")}</span> {a.action} {a.entity && <span className="text-ink-2">{a.entity}</span>}
                    {a.summary && <span className="text-ink-2"> “{a.summary}”</span>}
                    <span className="block text-xs text-ink-3">{stamp(a.createdAt)} UTC</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Nothing has been changed yet. Edits, moderation and autopilot runs will show up here.</p>
            )}
          </Card>

          <Card title="Articles by topic">
            <RankedBars unit="articles" rows={data.topics.map((t) => ({ key: t.name, label: t.name, value: t.articles }))} />
          </Card>
        </div>
      </div>
    </div>
  );
}
