import type { Metadata } from "next";
import { messageAction } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { EmptyState, FilterTabs, Notice, one, PageHeader, stamp } from "@/components/admin/ui";
import { Icon } from "@/components/Icon";
import { listMessages } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/auth";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  await requireStaff();
  const query = await searchParams;
  const status = one(query.status);
  const { rows, counts } = await listMessages(status);
  const back = status ? `/admin/messages?status=${encodeURIComponent(status)}` : "/admin/messages";

  return (
    <>
      <PageHeader title="Messages" description="What readers sent through the contact form. Replies go from your own email: the “Reply” button opens it with the address filled in." />
      <Notice query={query} />
      <div className="mb-4">
        <FilterTabs
          base="/admin/messages"
          query={query}
          name="status"
          tabs={[
            { value: "", label: "Inbox", count: counts.new + counts.read },
            { value: "new", label: "Unread", count: counts.new },
            { value: "archived", label: "Archived", count: counts.archived },
          ]}
        />
      </div>
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li key={m.id} className={cn("admin-card p-5", m.status === "new" && "border-l-4 border-l-[var(--indigo-solid)]")}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-semibold">
                  {m.subject || "No subject"}
                  {m.status === "new" && <span className="badge badge-blue ml-2 align-middle">Unread</span>}
                </p>
                <p className="text-sm text-ink-3">{stamp(m.createdAt)} UTC</p>
              </div>
              <p className="mt-0.5 text-sm text-ink-2">
                {m.name} · {m.email}
              </p>
              <p className="mt-3 max-w-[75ch] whitespace-pre-line text-[0.9375rem] leading-relaxed">{m.message}</p>
              <div className="mt-4 flex flex-wrap items-center gap-1">
                <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "Your message to Health Maxxing"}`)}`} className="btn btn-outline btn-sm">
                  <Icon name="mail" size={14} /> Reply
                </a>
                <form action={messageAction} className="inline-flex items-center gap-1">
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="_back" value={back} />
                  {m.status === "new" ? (
                    <button type="submit" name="op" value="read" className="btn btn-ghost btn-sm">
                      Mark as read
                    </button>
                  ) : (
                    <button type="submit" name="op" value="new" className="btn btn-ghost btn-sm">
                      Mark unread
                    </button>
                  )}
                  {m.status !== "archived" && (
                    <button type="submit" name="op" value="archived" className="btn btn-ghost btn-sm">
                      Archive
                    </button>
                  )}
                  <ConfirmSubmit name="op" value="delete" confirm="Delete for good">
                    Delete
                  </ConfirmSubmit>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="admin-card">
          <EmptyState sticker="mail" title={status === "archived" ? "Nothing archived." : "No messages."}>
            Messages from the contact page appear here.
          </EmptyState>
        </div>
      )}
    </>
  );
}
