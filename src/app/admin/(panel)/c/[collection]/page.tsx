import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { bulkEntriesAction } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { SelectAll } from "@/components/admin/SelectAll";
import { day, EmptyState, FactBadge, FilterTabs, Notice, one, PageHeader, Pager, StatusBadge } from "@/components/admin/ui";
import { Icon } from "@/components/Icon";
import { getCollection } from "@/lib/admin/collections";
import { listRows, loadOptions } from "@/lib/admin/store";
import { requireStaff } from "@/lib/auth";
import { requestTime } from "@/lib/now";
import { PageTransition } from "@/components/motion/PageTransition";

type Props = PageProps<"/admin/c/[collection]">;

// A fixed title: reading the URL in generateMetadata would stop the page from being prefetched.
export const metadata: Metadata = { title: "Content" };

const ORIGIN_LABEL: Record<string, string> = { autopilot: "Autopilot", api: "API" };

export default async function CollectionListPage({ params, searchParams }: Props) {
  await requireStaff();
  await connection();
  const [{ collection }, query] = await Promise.all([params, searchParams]);
  const def = getCollection(collection);
  if (!def) notFound();

  const base = `/admin/c/${def.key}`;
  const q = one(query.q);
  const topic = one(query.topic);
  const [result, options] = await Promise.all([
    listRows(def, { q, status: one(query.status), fact: one(query.fact), topic, page: Number(one(query.page)) || 1 }),
    def.topicColumn ? loadOptions() : Promise.resolve(null),
  ]);
  const topicName = new Map(options?.categories.map((o) => [o.value, o.label]) ?? []);
  const now = await requestTime();

  // Where bulk actions return to: this list with its current filters.
  const backParams = new URLSearchParams();
  for (const key of ["q", "status", "fact", "topic", "page"]) {
    const v = one(query[key]);
    if (v) backParams.set(key, v);
  }
  const back = backParams.size ? `${base}?${backParams}` : base;
  const filtered = !!(q || topic || one(query.status) || one(query.fact));

  return (
    <PageTransition variant="panel">
      <PageHeader
        title={def.plural}
        description={def.blurb}
        actions={
          <Link href={`${base}/new`} className="btn btn-primary">
            <Icon name="plus" size={16} /> New {def.singular}
          </Link>
        }
      />
      <Notice query={query} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          base={base}
          query={query}
          name="status"
          tabs={[
            { value: "", label: "All", count: result.counts.all },
            { value: "published", label: "Published", count: result.counts.published },
            { value: "draft", label: "Drafts", count: result.counts.draft },
          ]}
        />
        <Form action={base} className="flex flex-wrap items-center gap-2">
          {one(query.status) && <input type="hidden" name="status" value={one(query.status)} />}
          {def.factCheck && (
            <select name="fact" defaultValue={one(query.fact)} className="select h-10 w-auto py-0 text-sm" aria-label="Fact check">
              <option value="">Any fact check</option>
              <option value="pending">Pending ({result.counts.pending})</option>
              <option value="verified">Verified</option>
            </select>
          )}
          {options && (
            <select name="topic" defaultValue={topic} className="select h-10 w-auto py-0 text-sm" aria-label="Topic">
              <option value="">Every topic</option>
              {options.categories.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          <input type="search" name="q" defaultValue={q} placeholder={`Search ${def.plural.toLowerCase()}`} aria-label={`Search ${def.plural.toLowerCase()}`} className="input h-10 w-48 py-0 text-sm sm:w-56" />
          <button type="submit" className="btn btn-outline btn-sm h-10">
            Filter
          </button>
          {filtered && (
            <Link href={base} className="btn btn-ghost btn-sm h-10">
              Clear
            </Link>
          )}
        </Form>
      </div>

      <form action={bulkEntriesAction} className="admin-card overflow-hidden">
        <input type="hidden" name="_collection" value={def.key} />
        <input type="hidden" name="_back" value={back} />
        {result.rows.length ? (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5 text-sm">
              <span className="mr-1 text-ink-3">With ticked rows:</span>
              <button type="submit" name="op" value="publish" className="btn btn-ghost btn-sm">
                Publish
              </button>
              <button type="submit" name="op" value="draft" className="btn btn-ghost btn-sm">
                Move to drafts
              </button>
              {def.factCheck && (
                <>
                  <button type="submit" name="op" value="verify" className="btn btn-ghost btn-sm">
                    Mark verified
                  </button>
                  <button type="submit" name="op" value="unverify" className="btn btn-ghost btn-sm">
                    Mark pending
                  </button>
                </>
              )}
              <ConfirmSubmit name="op" value="delete" confirm="Delete ticked rows">
                Delete
              </ConfirmSubmit>
              <span className="ml-auto tabular-nums text-ink-3">
                {result.total.toLocaleString("en-US")} {result.total === 1 ? def.singular : `${def.singular}s`.replace(/ys$/, "ies")}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="w-10">
                      <SelectAll />
                    </th>
                    <th>{def.singular.charAt(0).toUpperCase() + def.singular.slice(1)}</th>
                    {def.topicColumn && <th>Topic</th>}
                    <th>Status</th>
                    {def.factCheck && <th>Fact check</th>}
                    {def.hasViews && <th className="num">Views</th>}
                    <th>Updated</th>
                    <th>
                      <span className="sr-only">Links</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => {
                    const scheduled = !!row.publishedAt && Date.parse(row.publishedAt) > now;
                    return (
                      <tr key={row.id}>
                        <td>
                          <input type="checkbox" name="ids" value={row.id} aria-label={`Select ${row.title}`} className="size-4 accent-[var(--ink)]" />
                        </td>
                        <td className="max-w-[440px]">
                          <Link href={`${base}/${row.id}`} className="font-semibold underline-offset-4 hover:underline">
                            {row.title || "(untitled)"}
                          </Link>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                            <span className="truncate">{row.slug}</span>
                            {ORIGIN_LABEL[row.origin] && <span className="badge badge-blue">{ORIGIN_LABEL[row.origin]}</span>}
                          </span>
                        </td>
                        {def.topicColumn && <td className="whitespace-nowrap text-ink-2">{topicName.get(row.topic ?? "") ?? row.topic ?? "—"}</td>}
                        <td>
                          <StatusBadge status={row.status} publishedAt={row.publishedAt} scheduled={scheduled} />
                        </td>
                        {def.factCheck && (
                          <td>
                            <FactBadge state={row.factCheck} />
                          </td>
                        )}
                        {def.hasViews && <td className="num">{(row.views ?? 0).toLocaleString("en-US")}</td>}
                        <td className="whitespace-nowrap text-ink-2">{day(row.updatedAt)}</td>
                        <td className="whitespace-nowrap text-right">
                          <Link href={`${base}/${row.id}`} className="inline-flex size-8 items-center justify-center rounded-lg text-ink-3 transition-colors duration-(--dur-fast) hover:bg-sand-2 hover:text-ink" aria-label={`Edit ${row.title}`} title="Edit">
                            <Icon name="edit" size={16} />
                          </Link>
                          {def.publicPath && row.status === "published" && !scheduled && (
                            <Link
                              href={def.publicPath.replace("{slug}", row.slug)}
                              target="_blank"
                              className="inline-flex size-8 items-center justify-center rounded-lg text-ink-3 transition-colors duration-(--dur-fast) hover:bg-sand-2 hover:text-ink"
                              aria-label={`View ${row.title} on the site`}
                              title="View on the site"
                            >
                              <Icon name="external" size={16} />
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState title={filtered ? "Nothing matches those filters." : `No ${def.plural.toLowerCase()} yet.`}>
            {filtered ? (
              <Link href={base} className="font-semibold underline underline-offset-4">
                Clear the filters
              </Link>
            ) : (
              <Link href={`${base}/new`} className="font-semibold underline underline-offset-4">
                Create the first {def.singular}
              </Link>
            )}
          </EmptyState>
        )}
      </form>
      <Pager base={base} query={query} page={result.page} pages={result.pages} />
    </PageTransition>
  );
}
