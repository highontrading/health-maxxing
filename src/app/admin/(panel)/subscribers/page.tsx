import type { Metadata } from "next";
import Form from "next/form";
import { subscriberAction } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { day, EmptyState, FilterTabs, Notice, one, PageHeader, Pager } from "@/components/admin/ui";
import { Icon } from "@/components/Icon";
import { listSubscribers } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = { title: "Subscribers" };

export default async function SubscribersPage({ searchParams }: PageProps<"/admin/subscribers">) {
  await requireAdmin();
  const query = await searchParams;
  const q = one(query.q);
  const status = one(query.status);
  const { rows, total, page, pages, counts } = await listSubscribers({ q, status, page: Number(one(query.page)) || 1 });
  const backParams = new URLSearchParams();
  for (const key of ["q", "status", "page"]) if (one(query[key])) backParams.set(key, one(query[key]));
  const back = backParams.size ? `/admin/subscribers?${backParams}` : "/admin/subscribers";

  return (
    <PageTransition variant="panel">
      <PageHeader
        title="Subscribers"
        description="People who signed up for the newsletter. Admins only: this list contains email addresses."
        actions={
          // A plain link: the file is served by a route handler, not a page.
          <a href="/admin/export/subscribers" className="btn btn-outline" download>
            <Icon name="download" size={16} /> Download CSV
          </a>
        }
      />
      <Notice query={query} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          base="/admin/subscribers"
          query={query}
          name="status"
          tabs={[
            { value: "", label: "All", count: counts.active + counts.unsubscribed },
            { value: "active", label: "Active", count: counts.active },
            { value: "unsubscribed", label: "Unsubscribed", count: counts.unsubscribed },
          ]}
        />
        <Form action="/admin/subscribers" className="flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input type="search" name="q" defaultValue={q} placeholder="Search by email" aria-label="Search subscribers" className="input h-10 w-64 max-w-full py-0 text-sm" />
          <button type="submit" className="btn btn-outline btn-sm h-10">
            Search
          </button>
        </Form>
      </div>
      <div className="admin-card overflow-hidden">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Signed up from</th>
                  <th>Date</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.email}</td>
                    <td className="text-ink-2">{s.name || "—"}</td>
                    <td>{s.status === "active" ? <span className="badge badge-green">Active</span> : <span className="badge badge-gray">Unsubscribed</span>}</td>
                    <td className="text-ink-2">{s.source}</td>
                    <td className="whitespace-nowrap text-ink-2">{day(s.createdAt)}</td>
                    <td className="whitespace-nowrap text-right">
                      <form action={subscriberAction} className="inline-flex items-center gap-1">
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="_back" value={back} />
                        {s.status === "active" && (
                          <button type="submit" name="op" value="unsubscribe" className="btn btn-ghost btn-sm">
                            Unsubscribe
                          </button>
                        )}
                        <ConfirmSubmit name="op" value="remove" confirm="Erase this address">
                          Erase
                        </ConfirmSubmit>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState sticker="mail" title={q || status ? "No subscriber matches." : "No subscribers yet."}>
            Sign-up forms are in the footer, on the newsletter page and at the end of every article.
          </EmptyState>
        )}
      </div>
      <p className="mt-3 text-sm text-ink-3">
        {total.toLocaleString("en-US")} shown. “Erase” deletes the address completely, which is what a data-removal request asks for.
      </p>
      <Pager base="/admin/subscribers" query={query} page={page} pages={pages} />
    </PageTransition>
  );
}
