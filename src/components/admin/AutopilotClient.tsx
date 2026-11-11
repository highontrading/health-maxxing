"use client";

import Link from "next/link";
import { useActionState } from "react";
import { EMPTY } from "@/app/actions/types";
import { addTopicAction, createTokenAction, runAutopilotAction, suggestTopicsAction } from "@/app/admin/actions";
import { Icon } from "@/components/Icon";
import { Spinner } from "@/components/motion/Spinner";
import { CopyButton } from "./MediaClient";
import { useAnswerCount } from "./motion";

export function AddTopicForm({ categories }: { categories: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState(addTopicAction, EMPTY);
  // Messages are keyed by this, so each answer fades in afresh (admin-result).
  const answer = useAnswerCount(state);
  // After a successful add the fields start empty again.
  const v = state.ok ? {} : (state.values ?? {});
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="ap-topic" className="field-label">
          Topic or working headline
        </label>
        <input id="ap-topic" name="topic" className="input" maxLength={200} required placeholder="Is cold-water swimming actually good for you?" defaultValue={v.topic} aria-invalid={!!state.errors?.topic || undefined} />
        {state.errors?.topic && (
          <p key={answer} className="field-error admin-result" role="alert">
            {state.errors.topic}
          </p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <label htmlFor="ap-category" className="field-label">
            File under
          </label>
          <select id="ap-category" name="category" className="select" defaultValue={v.category ?? ""}>
            <option value="">Let Claude choose</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ap-notes" className="field-label">
            Notes for the writer (optional)
          </label>
          <input id="ap-notes" name="notes" className="input" maxLength={2000} placeholder="Angle, audience, things to include or avoid" defaultValue={v.notes} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-outline" disabled={pending}>
          <Icon name="plus" size={16} /> {pending ? "Adding…" : "Add to queue"}
        </button>
        {state.ok && (
          <p key={answer} role="status" className="admin-result text-sm font-semibold text-[var(--green-ink)]">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

export function RunControls({ ready, waiting }: { ready: boolean; waiting: number }) {
  const [run, runAction, running] = useActionState(runAutopilotAction, EMPTY);
  const [suggest, suggestAction, suggesting] = useActionState(suggestTopicsAction, EMPTY);
  const busy = running || suggesting;
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <form action={runAction}>
          <button type="submit" className="btn btn-primary" disabled={!ready || busy || waiting === 0}>
            {running ? <Spinner /> : <Icon name="bot" size={16} />} {running ? "Researching and writing…" : "Draft the next topic now"}
          </button>
        </form>
        <form action={suggestAction}>
          <button type="submit" className="btn btn-outline" disabled={!ready || busy}>
            {suggesting ? <Spinner /> : <Icon name="sparkles" size={16} />} {suggesting ? "Thinking of topics…" : "Suggest 5 topics"}
          </button>
        </form>
      </div>
      {running && <p className="admin-result mt-2 text-sm text-ink-2">This takes a few minutes. Keep this tab open until it finishes.</p>}
      {/* The results are removed while a run is busy, so each one arrives fresh and fades in. */}
      {!busy && run.message && (
        <p role={run.ok ? "status" : "alert"} className={run.ok ? "admin-result mt-2 text-sm font-semibold text-[var(--green-ink)]" : "field-error admin-result mt-2"}>
          {run.message}{" "}
          {run.ok && run.values?.articleId && (
            <Link href={`/admin/c/articles/${run.values.articleId}`} className="underline underline-offset-4">
              Open the draft
            </Link>
          )}
        </p>
      )}
      {!busy && suggest.message && (
        <p role={suggest.ok ? "status" : "alert"} className={suggest.ok ? "admin-result mt-2 text-sm font-semibold text-[var(--green-ink)]" : "field-error admin-result mt-2"}>
          {suggest.message}
        </p>
      )}
      {!ready && <p className="mt-2 text-sm text-ink-3">These buttons turn on once the server has an Anthropic API key.</p>}
      {ready && waiting === 0 && !busy && <p className="mt-2 text-sm text-ink-3">The queue is empty. Add a topic, or let Claude suggest some.</p>}
    </div>
  );
}

export function TokenCreator() {
  const [state, action, pending] = useActionState(createTokenAction, EMPTY);
  const answer = useAnswerCount(state);
  return (
    <div>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="token-name" className="field-label">
            What will use this token?
          </label>
          <input id="token-name" name="name" className="input" maxLength={60} required placeholder="Claude Code on my laptop" aria-invalid={!!state.errors?.name || undefined} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          <Icon name="key" size={16} /> {pending ? "Creating…" : "Create token"}
        </button>
      </form>
      {state.errors?.name && (
        <p key={answer} className="field-error admin-result" role="alert">
          {state.errors.name}
        </p>
      )}
      {state.ok && state.values?.token && (
        <div key={answer} role="status" className="admin-banner mt-4 rounded-2xl bg-[var(--lime-soft)] p-4 text-[var(--lime-ink)]">
          <p className="font-semibold">{state.message}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="break-all rounded-lg bg-paper px-3 py-2 font-mono text-sm text-ink">{state.values.token}</code>
            <CopyButton text={state.values.token} label="Copy token" />
          </div>
        </div>
      )}
    </div>
  );
}
