import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, one, PageHeader, stamp } from "@/components/admin/ui";
import { Icon } from "@/components/Icon";
import { recentActivity } from "@/lib/activity";
import { requireStaff } from "@/lib/auth";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = { title: "Activity" };

const PER_PAGE = 60;

export default async function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  await requireStaff();
  const page = Math.max(1, Number(one((await searchParams).page)) || 1);
  // One extra row tells us whether there is an older page.
  const rows = await recentActivity(PER_PAGE + 1, (page - 1) * PER_PAGE);
  const more = rows.length > PER_PAGE;
  return (
    <PageTransition variant="panel">
      <PageHeader title="Activity" description="Who changed what: edits in this panel, moderation, API calls and autopilot runs. Times are in UTC." />
      <div className="admin-card overflow-hidden">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>What</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, PER_PAGE).map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap text-ink-2">{stamp(a.createdAt)}</td>
                    <td className="whitespace-nowrap font-medium">{a.actor}</td>
                    <td className="whitespace-nowrap">
                      {a.action} {a.entity}
                      {a.entityId && <span className="text-ink-3"> #{a.entityId}</span>}
                    </td>
                    <td className="text-ink-2">{a.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Nothing logged yet." />
        )}
      </div>
      {(page > 1 || more) && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={page === 2 ? "/admin/activity" : `/admin/activity?page=${page - 1}`} className="btn btn-outline btn-sm">
              <Icon name="arrow-left" size={14} /> Newer
            </Link>
          ) : (
            <span />
          )}
          {more && (
            <Link href={`/admin/activity?page=${page + 1}`} className="btn btn-outline btn-sm">
              Older <Icon name="arrow-right" size={14} />
            </Link>
          )}
        </nav>
      )}
    </PageTransition>
  );
}
