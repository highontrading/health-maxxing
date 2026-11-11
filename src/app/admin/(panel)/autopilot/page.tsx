import type { Metadata } from "next";
import Link from "next/link";
import { topicAction } from "@/app/admin/actions";
import { AddTopicForm, RunControls } from "@/components/admin/AutopilotClient";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { Card, day, Notice, PageHeader } from "@/components/admin/ui";
import { Icon } from "@/components/Icon";
import { flattenSettings, loadSettingsFresh } from "@/lib/admin/settings-store";
import { loadOptions } from "@/lib/admin/store";
import { requireAdmin } from "@/lib/auth";
import { autopilotConfigured, listTopics, type Topic } from "@/lib/autopilot";
import { siteUrl } from "@/lib/site";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = { title: "Autopilot" };

// The "draft now" button waits for Claude, which takes a few minutes.
export const maxDuration = 300;

const fmt = (v: number) => v.toLocaleString("en-US");

function TopicRow({ topic, categoryName }: { topic: Topic; categoryName: string }) {
  const r = topic.report;
  return (
    <li className="rounded-2xl bg-sand p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{topic.topic}</p>
          <p className="mt-0.5 text-sm text-ink-3">
            {categoryName || "Topic chosen by Claude"} · added {day(topic.createdAt)}
          </p>
          {topic.notes && <p className="mt-1.5 text-sm text-ink-2">{topic.notes}</p>}
        </div>
        <div className="flex flex-none items-center gap-1">
          {topic.status === "queued" && <span className="badge badge-gray">Waiting</span>}
          {topic.status === "drafting" && <span className="badge badge-blue">Writing now</span>}
          {topic.status === "done" && (
            <span className="badge badge-green">
              <Icon name="check" size={12} /> Drafted
            </span>
          )}
          {topic.status === "failed" && (
            <span className="badge badge-pink">
              <Icon name="alert" size={12} /> Failed
            </span>
          )}
        </div>
      </div>

      {topic.status === "failed" && <p className="mt-2 text-sm font-medium text-[#c21f48]">{topic.error}</p>}

      {topic.status === "done" && r && (
        <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
          <p className="text-ink-2">
            {fmt(r.words)} words · {r.researched ? `researched with ${r.searches} web ${r.searches === 1 ? "search" : "searches"}` : "written without web research"} · {r.servedBy}
            {" · "}
            {fmt(r.inputTokens)} tokens in, {fmt(r.outputTokens)} out
          </p>
          {r.warnings.length > 0 && (
            <div>
              <p className="font-semibold">Check before publishing</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-2">
                {r.warnings.map((w) => (
                  <li key={w} className="break-words">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {r.editorNotes && (
            <div>
              <p className="font-semibold">The writer’s notes to you</p>
              <p className="mt-1 whitespace-pre-line text-ink-2">{r.editorNotes}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1">
        {topic.status === "done" && topic.articleId && (
          <Link href={`/admin/c/articles/${topic.articleId}`} className="btn btn-outline btn-sm">
            <Icon name="edit" size={14} /> Review the draft
          </Link>
        )}
        {topic.status !== "drafting" && (
          <form action={topicAction} className="inline-flex items-center gap-1">
            <input type="hidden" name="id" value={topic.id} />
            {topic.status === "failed" && (
              <button type="submit" name="op" value="requeue" className="btn btn-ghost btn-sm">
                Try again
              </button>
            )}
            <ConfirmSubmit name="op" value="remove" confirm={topic.status === "done" ? "Remove from this list" : "Remove"}>
              {topic.status === "done" ? "Dismiss" : "Remove"}
            </ConfirmSubmit>
          </form>
        )}
      </div>
    </li>
  );
}

export default async function AutopilotPage({ searchParams }: PageProps<"/admin/autopilot">) {
  await requireAdmin();
  const [query, topics, options, settings] = await Promise.all([searchParams, listTopics(120), loadOptions(), loadSettingsFresh()]);
  const ready = autopilotConfigured();
  const names = new Map(options.categories.map((c) => [c.value, c.label]));
  const open = topics.filter((t) => t.status === "queued" || t.status === "drafting" || t.status === "failed");
  const done = topics.filter((t) => t.status === "done");
  const waiting = topics.filter((t) => t.status === "queued").length;
  const cronUrl = `${siteUrl()}/api/cron/autopilot`;

  return (
    <PageTransition variant="panel">
      <PageHeader
        title="Autopilot"
        description="Queue topics and Claude researches and drafts the articles. Drafts wait for your review, marked as pending a fact check, unless you choose to publish them automatically."
      />
      <Notice query={query} />
      {!ready && (
        <p role="status" className="mb-5 flex items-start gap-2 rounded-2xl bg-[var(--yellow-soft)] px-4 py-3 text-[0.9375rem] font-medium text-[var(--yellow-ink)]">
          <Icon name="key" size={18} className="mt-0.5 flex-none" />
          <span>
            The autopilot is off because the server has no Anthropic API key. Set the <code className="rounded bg-paper/70 px-1">ANTHROPIC_API_KEY</code> environment variable and restart. You can queue topics in the meantime.
          </span>
        </p>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-5">
          <Card title="Add a topic">
            <AddTopicForm categories={options.categories} />
          </Card>

          <Card title={`Queue (${waiting} waiting)`}>
            <RunControls ready={ready} waiting={waiting} />
            {open.length > 0 && (
              <ul className="mt-4 space-y-2.5">
                {open.map((t) => (
                  <TopicRow key={t.id} topic={t} categoryName={names.get(t.category) ?? ""} />
                ))}
              </ul>
            )}
          </Card>

          {done.length > 0 && (
            <Card title="Finished">
              <ul className="space-y-2.5">
                {done.map((t) => (
                  <TopicRow key={t.id} topic={t} categoryName={names.get(t.category) ?? ""} />
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* min-w-0: the command block below must scroll inside its card, not widen the page on a phone. */}
        <div className="min-w-0 space-y-5">
          <SettingsForm groups={["autopilot"]} values={flattenSettings(settings, ["autopilot"])} submitLabel="Save autopilot settings" />

          <Card title="Run it on a schedule">
            <p className="text-sm text-ink-2">
              Have any scheduler call this address, and each call drafts the next topics in the queue. Set <code className="rounded bg-sand-2 px-1">CRON_SECRET</code> on the server first.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-ink p-3 text-xs leading-relaxed text-paper">
              <code>{`curl -X POST ${cronUrl} \\\n  -H "Authorization: Bearer $CRON_SECRET"`}</code>
            </pre>
            <p className="mt-3 text-sm text-ink-3">Once a day is a sensible pace. The steps for cron, Vercel Cron and GitHub Actions are in the README.</p>
          </Card>

          <Card title="What a run does">
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-2">
              <li>Claude searches the web for current guidance and studies on the topic, and notes which pages it found.</li>
              <li>Claude writes the article in the house style, citing only those pages.</li>
              <li>The draft is checked for structure, saved, and listed here with anything you should look at.</li>
            </ol>
            <p className="mt-3 text-sm text-ink-3">An AI draft can still be wrong. Read it against its sources before you mark it verified and publish.</p>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
