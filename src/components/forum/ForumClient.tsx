"use client";

import { useActionState, useState } from "react";
import { createThreadAction, deleteOwnPostAction, likeAction, replyAction, reportAction } from "@/app/actions/forum";
import { EMPTY } from "@/app/actions/types";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";

const GUIDE = "Share experience, not prescriptions. Be kind, bring sources, no selling.";

export function ThreadForm({ boards, defaultBoard }: { boards: { slug: string; name: string }[]; defaultBoard?: string }) {
  const [state, action, pending] = useActionState(createThreadAction, EMPTY);
  const err = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <div>
        <label htmlFor="t-board" className="field-label">
          Board
        </label>
        <select id="t-board" name="board" className="select" defaultValue={v.board || defaultBoard || boards[1]?.slug || boards[0]?.slug} aria-invalid={!!err.board}>
          {boards.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
        {err.board && <p className="field-error">{err.board}</p>}
      </div>
      <div>
        <label htmlFor="t-title" className="field-label">
          Title
        </label>
        <input id="t-title" name="title" className="input" maxLength={140} required placeholder="Ask a question or name the topic" defaultValue={v.title} aria-invalid={!!err.title} aria-describedby={err.title ? "t-title-err" : undefined} />
        {err.title && <p id="t-title-err" className="field-error">{err.title}</p>}
      </div>
      <div>
        <label htmlFor="t-body" className="field-label">
          Your post
        </label>
        <textarea id="t-body" name="body" rows={9} className="textarea" maxLength={6000} required defaultValue={v.body} aria-invalid={!!err.body} aria-describedby="t-body-help" />
        {err.body ? <p className="field-error">{err.body}</p> : null}
        <p id="t-body-help" className="field-help">
          {GUIDE} Leave a blank line between paragraphs. Use **double asterisks** for bold and start a line with &gt; to quote.
        </p>
      </div>
      {state.message && (
        <p role="alert" className="field-error">
          {state.message}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? "Posting…" : "Post thread"}
      </button>
    </form>
  );
}

export function ReplyForm({ threadId }: { threadId: number }) {
  const [state, action, pending] = useActionState(replyAction, EMPTY);
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="threadId" value={threadId} />
      <label htmlFor="reply-body" className="field-label">
        Add a reply
      </label>
      <textarea id="reply-body" name="body" rows={5} className="textarea" maxLength={6000} required placeholder="What has your experience been?" defaultValue={state.ok ? "" : state.values?.body} aria-invalid={!!state.errors?.body} />
      {state.errors?.body && <p className="field-error">{state.errors.body}</p>}
      {state.message && (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm font-semibold text-[var(--green-ink)]" : "field-error"}>
          {state.message}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="field-help mt-0">{GUIDE}</p>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Posting…" : "Post reply"}
        </button>
      </div>
    </form>
  );
}

export function LikeButton({ type, id, count, liked, disabled }: { type: "thread" | "post"; id: number; count: number; liked: boolean; disabled?: boolean }) {
  return (
    <form action={likeAction}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={disabled}
        aria-pressed={liked}
        aria-label={liked ? `Remove like (${count})` : `Like (${count})`}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full border-[1.5px] px-3 text-sm font-semibold transition-colors disabled:opacity-50",
          liked ? "border-[var(--pink-solid)] bg-[var(--pink-soft)] text-[var(--pink-ink)]" : "border-line-strong text-ink-2 hover:border-ink hover:text-ink",
        )}
      >
        <Icon name="heart" size={15} fill={liked ? "currentColor" : "none"} />
        {count}
      </button>
    </form>
  );
}

export function ReportButton({ type, id }: { type: "thread" | "post"; id: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(reportAction, EMPTY);
  if (state.ok) return <span className="text-sm font-medium text-ink-3">{state.message}</span>;
  if (!open) {
    return (
      <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-ink-3 hover:bg-sand hover:text-ink" onClick={() => setOpen(true)}>
        <Icon name="flag" size={14} /> Report
      </button>
    );
  }
  return (
    <form action={action} className="flex w-full flex-wrap items-center gap-2 rounded-2xl bg-sand p-3">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`report-${type}-${id}`}>
        What is wrong with this post?
      </label>
      <input id={`report-${type}-${id}`} name="reason" className="input h-10 min-w-0 flex-1 text-sm" maxLength={500} placeholder="What is wrong with it? (optional)" />
      <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
        Send report
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
        Cancel
      </button>
      {state.message && <p className="field-error w-full">{state.message}</p>}
    </form>
  );
}

export function DeletePostButton({ id }: { id: number }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) {
    return (
      <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-ink-3 hover:bg-sand hover:text-ink" onClick={() => setConfirm(true)}>
        <Icon name="trash" size={14} /> Delete
      </button>
    );
  }
  return (
    <form action={deleteOwnPostAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <span className="text-sm text-ink-2">Delete this reply?</span>
      <button type="submit" className="btn btn-danger btn-sm">
        Delete
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>
        Keep
      </button>
    </form>
  );
}
