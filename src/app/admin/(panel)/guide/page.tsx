import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "How it works" };

function Topic({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="admin-card p-5">
      <h2 className="text-[1.0625rem] font-semibold">{title}</h2>
      <div className="mt-2 space-y-2 text-[0.9375rem] leading-relaxed text-ink-2 [&_a]:font-medium [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-sand-2 [&_code]:px-1 [&_code]:text-[0.875em]">
        {children}
      </div>
    </section>
  );
}

export default async function GuidePage() {
  const user = await requireStaff();
  return (
    <>
      <PageHeader title="How it works" description="A short tour of the panel, for whoever looks after the site." />
      <div className="grid max-w-5xl gap-4 lg:grid-cols-2">
        <Topic title="Writing and publishing">
          <p>
            Everything readers see lives under <strong>Publishing</strong>, <strong>Library</strong> and <strong>Structure</strong> in the menu. Open a row to edit it; press <strong>Save changes</strong> (or Ctrl/Cmd + S) and the site updates straight away.
          </p>
          <p>
            <strong>Draft</strong> means hidden. <strong>Published</strong> means live. An article with a publish date in the future is scheduled and appears on its own at that time.
          </p>
          <p>Articles are written in Markdown. The toolbar inserts headings, lists, tables and the coloured callout boxes; the Preview tab shows the result exactly as readers will see it.</p>
        </Topic>

        <Topic title="Sources and the fact-check badge">
          <p>
            Each article and condition has a sources list. In the text, <code>[^1]</code> points to source 1, <code>[^2]</code> to source 2, and so on.
          </p>
          <p>
            <strong>Fact check: pending</strong> means the page was written from established knowledge but nobody has yet checked every figure and link against its source. <strong>Verified</strong> means someone has, and readers then see a “Sources verified” badge. Only mark a page verified after doing that check.
          </p>
          <p>
            The dashboard shows how many pages are still pending, and <code>content/FACT_CHECK_QUEUE.md</code> in the code lists the specific claims to look at first.
          </p>
        </Topic>

        <Topic title="Where the content comes from">
          <p>
            The launch library was loaded from files in the <code>content/</code> folder of the code. Once you edit a page here, your version wins: later file changes never overwrite it. Pages you delete here stay deleted.
          </p>
          <p>That means there are two good ways to add content: write it here, or ask Claude Code to add or improve files in the repository, which are loaded on the next deploy.</p>
        </Topic>

        <Topic title="Autopilot">
          <p>
            <Link href="/admin/autopilot">Autopilot</Link> keeps a queue of topics. For each one, Claude searches the web for current guidance, writes an article in the house style and saves it as a draft with notes on what to double-check.
          </p>
          <p>It needs an Anthropic API key on the server, and it can run on a schedule. Drafts are never published without you unless you switch that on, which is not recommended for health content.</p>
        </Topic>

        <Topic title="Community">
          <p>
            <Link href="/admin/community">Moderation</Link> lists reports from members and the newest posts. <strong>Hide</strong> takes a post out of sight but keeps it; <strong>Delete</strong> is permanent. <strong>Lock</strong> stops new replies; <strong>Pin</strong> keeps a thread at the top of its board.
          </p>
          <p>
            Under <Link href="/admin/users">Members</Link> you can suspend an account. For spam, “Spam” suspends the account and hides everything it posted in one step. New accounts cannot post links for their first 24 hours.
          </p>
        </Topic>

        <Topic title="Newsletter">
          <p>
            Sign-ups collect under <Link href="/admin/subscribers">Subscribers</Link>, and issues you publish under <Link href="/admin/c/newsletter">Newsletter</Link> appear in the public archive.
          </p>
          <p>
            Open a published issue to send it. Sending needs an email service connected on the server (see the README); without one, download the subscriber list as a CSV and send from the email tool you already use.
          </p>
        </Topic>

        <Topic title="People and permissions">
          <p>
            <strong>Editors</strong> can write, publish and moderate. <strong>Admins</strong> can also change settings, roles, API tokens, subscribers and the autopilot. You are signed in as {user.role === "admin" ? "an admin" : "an editor"}.
          </p>
          <p>
            Every change is recorded in the <Link href="/admin/activity">activity log</Link>.
          </p>
        </Topic>

        <Topic title="Backups">
          <p>
            All content, members and posts are in one database. On a single server that is the file <code>data/health-maxxing.db</code>: copy it somewhere safe on a schedule. On a hosted database, use the provider’s backups.
          </p>
        </Topic>
      </div>
    </>
  );
}
