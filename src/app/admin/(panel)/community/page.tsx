import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { moderateAction, resolveReportAction } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { Card, day, EmptyState, Notice, one, PageHeader } from "@/components/admin/ui";
import { Icon } from "@/components/Icon";
import { listOpenReports, listRecentPosts, listRecentThreads } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/auth";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = { title: "Moderation" };

/** One moderation button: a tiny form that posts the action and returns here. */
function Mod({ type, id, op, back, children, danger }: { type: "thread" | "post"; id: number; op: string; back: string; children: ReactNode; danger?: boolean }) {
  return (
    <form action={moderateAction} className="inline-flex">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="op" value={op} />
      <input type="hidden" name="_back" value={back} />
      {danger ? (
        <ConfirmSubmit confirm="Delete for good">{children}</ConfirmSubmit>
      ) : (
        <button type="submit" className="btn btn-ghost btn-sm">
          {children}
        </button>
      )}
    </form>
  );
}

export default async function CommunityPage({ searchParams }: PageProps<"/admin/community">) {
  await requireStaff();
  const query = await searchParams;
  const q = one(query.q);
  const back = q ? `/admin/community?q=${encodeURIComponent(q)}` : "/admin/community";
  const [reports, threads, posts] = await Promise.all([listOpenReports(), listRecentThreads(q), listRecentPosts(q)]);

  return (
    <PageTransition variant="panel">
      <PageHeader
        title="Moderation"
        description="Reports from members, plus the newest threads and replies. Hiding keeps a post in the database but out of sight; deleting is permanent."
      />
      <Notice query={query} />

      <Card title={`Open reports (${reports.length})`} className="mb-5">
        {reports.length ? (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-2xl bg-sand p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="badge badge-pink">
                    <Icon name="flag" size={12} /> Reported {r.targetType === "thread" ? "thread" : "reply"}
                  </span>
                  {r.hidden && <span className="badge badge-gray">Already hidden</span>}
                  <span className="text-ink-3">
                    by @{r.reporter ?? "deleted member"} on {day(r.createdAt)}
                  </span>
                </div>
                <p className="mt-2 font-semibold">{r.title}</p>
                {r.excerpt && <p className="mt-1 whitespace-pre-line text-[0.9375rem] text-ink-2">{r.excerpt}</p>}
                <p className="mt-2 text-sm">
                  <span className="text-ink-3">Posted by</span> @{r.author}
                  {r.reason && (
                    <>
                      <span className="text-ink-3"> · Reason given:</span> “{r.reason}”
                    </>
                  )}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1">
                  {r.threadId !== null && (
                    <Link href={`/community/t/${r.threadId}${r.targetType === "post" ? `#post-${r.targetId}` : ""}`} target="_blank" className="btn btn-outline btn-sm">
                      Open <Icon name="external" size={14} />
                    </Link>
                  )}
                  {r.threadId !== null && !r.hidden && (
                    <Mod type={r.targetType} id={r.targetId} op="hide" back={back}>
                      Hide it
                    </Mod>
                  )}
                  {r.threadId !== null && (
                    <Mod type={r.targetType} id={r.targetId} op="delete" back={back} danger>
                      Delete it
                    </Mod>
                  )}
                  <form action={resolveReportAction} className="inline-flex">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="op" value="dismiss" />
                    <input type="hidden" name="_back" value={back} />
                    <button type="submit" className="btn btn-ghost btn-sm">
                      Nothing wrong, dismiss
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState sticker="check" title="No open reports.">
            When a member flags a post, it lands here.
          </EmptyState>
        )}
      </Card>

      <Form action="/admin/community" className="mb-4 flex flex-wrap items-center gap-2">
        <input type="search" name="q" defaultValue={q} placeholder="Search posts or @handle" aria-label="Search posts" className="input h-10 w-72 max-w-full py-0 text-sm" />
        <button type="submit" className="btn btn-outline btn-sm h-10">
          Search
        </button>
        {q && (
          <Link href="/admin/community" className="btn btn-ghost btn-sm h-10">
            Clear
          </Link>
        )}
      </Form>

      <Card title={q ? "Matching threads" : "Newest threads"} flush className="mb-5 overflow-hidden">
        {threads.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Thread</th>
                  <th>Board</th>
                  <th>By</th>
                  <th className="num">Replies</th>
                  <th>Posted</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {threads.map((t) => (
                  <tr key={t.id}>
                    <td className="max-w-[360px]">
                      <Link href={`/community/t/${t.id}`} target="_blank" className="font-semibold underline-offset-4 hover:underline">
                        {t.title}
                      </Link>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {t.pinned && <span className="badge badge-blue">Pinned</span>}
                        {t.locked && <span className="badge badge-yellow">Locked</span>}
                        {t.hidden && <span className="badge badge-gray">Hidden</span>}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-ink-2">{t.board}</td>
                    <td className="whitespace-nowrap">
                      <Link href={`/admin/users?q=${encodeURIComponent(t.author)}`} className="underline-offset-4 hover:underline">
                        @{t.author}
                      </Link>
                    </td>
                    <td className="num">{t.replies}</td>
                    <td className="whitespace-nowrap text-ink-2">{day(t.createdAt)}</td>
                    <td className="whitespace-nowrap text-right">
                      <Mod type="thread" id={t.id} op={t.pinned ? "unpin" : "pin"} back={back}>
                        {t.pinned ? "Unpin" : "Pin"}
                      </Mod>
                      <Mod type="thread" id={t.id} op={t.locked ? "unlock" : "lock"} back={back}>
                        {t.locked ? "Unlock" : "Lock"}
                      </Mod>
                      <Mod type="thread" id={t.id} op={t.hidden ? "show" : "hide"} back={back}>
                        {t.hidden ? "Unhide" : "Hide"}
                      </Mod>
                      <Mod type="thread" id={t.id} op="delete" back={back} danger>
                        Delete
                      </Mod>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No threads found." />
        )}
      </Card>

      <Card title={q ? "Matching replies" : "Newest replies"} flush className="overflow-hidden">
        {posts.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reply</th>
                  <th>By</th>
                  <th>Posted</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td className="max-w-[520px]">
                      <p className="whitespace-pre-line">{p.excerpt}</p>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
                        {p.hidden && <span className="badge badge-gray">Hidden</span>}
                        in
                        <Link href={`/community/t/${p.threadId}#post-${p.id}`} target="_blank" className="underline underline-offset-2">
                          {p.threadTitle}
                        </Link>
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      <Link href={`/admin/users?q=${encodeURIComponent(p.author)}`} className="underline-offset-4 hover:underline">
                        @{p.author}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap text-ink-2">{day(p.createdAt)}</td>
                    <td className="whitespace-nowrap text-right">
                      <Mod type="post" id={p.id} op={p.hidden ? "show" : "hide"} back={back}>
                        {p.hidden ? "Unhide" : "Hide"}
                      </Mod>
                      <Mod type="post" id={p.id} op="delete" back={back} danger>
                        Delete
                      </Mod>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No replies found." />
        )}
      </Card>
    </PageTransition>
  );
}
