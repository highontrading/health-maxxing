"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createThreadAction, deleteOwnPostAction, likeAction, replyAction, reportAction } from "@/app/actions/forum";
import { EMPTY } from "@/app/actions/types";
import { bringIntoView, FieldError, FormMessage, SubmitLabel, useAnswerCount } from "@/components/auth/FormFeedback";
import { Icon } from "@/components/Icon";
import { Collapse } from "@/components/motion/Collapse";
import { usePresence } from "@/components/motion/presence";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/hooks";

const GUIDE = "Share experience, not prescriptions. Be kind, bring sources, no selling.";

export function ThreadForm({ boards, defaultBoard }: { boards: { slug: string; name: string }[]; defaultBoard?: string }) {
  const [state, action, pending] = useActionState(createThreadAction, EMPTY);
  const err = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="site-form space-y-5" noValidate>
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
        {err.board && <FieldError>{err.board}</FieldError>}
      </div>
      <div>
        <label htmlFor="t-title" className="field-label">
          Title
        </label>
        <input id="t-title" name="title" className="input" maxLength={140} required placeholder="Ask a question or name the topic" defaultValue={v.title} aria-invalid={!!err.title} aria-describedby={err.title ? "t-title-err" : undefined} />
        {err.title && <FieldError id="t-title-err">{err.title}</FieldError>}
      </div>
      <div>
        <label htmlFor="t-body" className="field-label">
          Your post
        </label>
        <textarea id="t-body" name="body" rows={9} className="textarea" maxLength={6000} required defaultValue={v.body} aria-invalid={!!err.body} aria-describedby="t-body-help" />
        {err.body ? <FieldError>{err.body}</FieldError> : null}
        <p id="t-body-help" className="field-help">
          {GUIDE} Leave a blank line between paragraphs. Use **double asterisks** for bold and start a line with &gt; to quote.
        </p>
      </div>
      <FormMessage state={state} />
      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        <SubmitLabel pending={pending} idle="Post thread" busy="Posting…" />
      </button>
    </form>
  );
}

/** The replies of a thread, looked up inside the form's own <main>: the previous page can still be in the document, hidden. */
const REPLIES = 'li[id^="post-"]';

export function ReplyForm({ threadId }: { threadId: number }) {
  const [state, action, pending] = useActionState(replyAction, EMPTY);
  const form = useRef<HTMLFormElement>(null);
  // The replies that were on the page when the form was sent, so the new one can be told apart.
  const before = useRef<Set<string> | null>(null);

  // Once a reply is posted, bring it into view and highlight it once.
  useEffect(() => {
    const known = before.current;
    const thread = form.current?.closest("main");
    if (!state.ok || !known || !thread) return;
    before.current = null;

    const newest = () => [...thread.querySelectorAll<HTMLElement>(REPLIES)].filter((li) => !known.has(li.id)).pop();
    let listWatcher: MutationObserver | undefined;
    let viewWatcher: IntersectionObserver | undefined;
    let giveUp = 0;

    const present = (li: HTMLElement) => {
      bringIntoView(li);
      // Reduced motion: the reply is in view, and that is all.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const done = (event: AnimationEvent) => {
        if (event.target !== li) return;
        li.classList.remove("reply-new");
        li.removeEventListener("animationend", done);
      };
      // The highlight starts once most of the reply is on screen (below the sticky header), so a scroll does not use it up.
      const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const most = Math.min(1, (window.innerHeight - header) / li.offsetHeight) * 0.75;
      viewWatcher = new IntersectionObserver(
        (entries) => {
          // The ratio reported at the threshold can be a hair under it.
          if (!entries.some((entry) => entry.intersectionRatio >= most - 0.01)) return;
          viewWatcher?.disconnect();
          li.addEventListener("animationend", done);
          li.classList.add("reply-new");
        },
        { rootMargin: `-${header}px 0px 0px 0px`, threshold: most },
      );
      viewWatcher.observe(li);
    };

    const li = newest();
    if (li) {
      present(li);
    } else {
      // The refreshed list can arrive a moment after the action's answer.
      listWatcher = new MutationObserver(() => {
        const added = newest();
        if (!added) return;
        listWatcher?.disconnect();
        window.clearTimeout(giveUp);
        present(added);
      });
      listWatcher.observe(thread, { childList: true, subtree: true });
      giveUp = window.setTimeout(() => listWatcher?.disconnect(), 4000);
    }
    return () => {
      listWatcher?.disconnect();
      viewWatcher?.disconnect();
      window.clearTimeout(giveUp);
    };
  }, [state]);

  return (
    <form
      ref={form}
      action={action}
      className="site-form space-y-3"
      noValidate
      onSubmit={(event) => {
        const thread = event.currentTarget.closest("main");
        before.current = new Set(Array.from(thread?.querySelectorAll(REPLIES) ?? [], (li) => li.id));
      }}
    >
      <input type="hidden" name="threadId" value={threadId} />
      <label htmlFor="reply-body" className="field-label">
        Add a reply
      </label>
      <textarea id="reply-body" name="body" rows={5} className="textarea" maxLength={6000} required placeholder="What has your experience been?" defaultValue={state.ok ? "" : state.values?.body} aria-invalid={!!state.errors?.body} />
      {state.errors?.body && <FieldError>{state.errors.body}</FieldError>}
      <FormMessage state={state} ok={state.ok} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="field-help mt-0">{GUIDE}</p>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          <SubmitLabel pending={pending} idle="Post reply" busy="Posting…" />
        </button>
      </div>
    </form>
  );
}

export function LikeButton({ type, id, count, liked, disabled }: { type: "thread" | "post"; id: number; count: number; liked: boolean; disabled?: boolean }) {
  // Nothing animates until the visitor has used the button: a heart that was already filled must not bump when the page opens.
  const [used, setUsed] = useState(false);
  return (
    <form action={likeAction} onSubmit={() => setUsed(true)}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <LikeToggle count={count} liked={liked} disabled={disabled} lively={used} />
    </form>
  );
}

/** The button of a like form. It shows the answer it expects while the click is on its way to the server. */
function LikeToggle({ count, liked, disabled, lively }: { count: number; liked: boolean; disabled?: boolean; lively: boolean }) {
  const { pending } = useFormStatus();
  const on = pending ? !liked : liked;
  const shown = pending ? count + (liked ? -1 : 1) : count;
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-pressed={on}
      aria-label={on ? `Remove like (${shown})` : `Like (${shown})`}
      onClick={(event) => {
        // One click at a time: a second one before the answer would undo the first.
        if (pending) event.preventDefault();
      }}
      className={cn(
        "like-button inline-flex h-9 items-center gap-1.5 rounded-full border-[1.5px] px-3 text-sm font-semibold disabled:opacity-50",
        on ? "border-[var(--pink-solid)] bg-[var(--pink-soft)] text-[var(--pink-ink)]" : "border-line-strong text-ink-2 hover:border-ink hover:text-ink",
      )}
    >
      {/* Keyed, so the heart and the number are new elements when they change and their one-shot animations play. */}
      <Icon key={on ? "on" : "off"} name="heart" size={15} fill={on ? "currentColor" : "none"} className={lively && on ? "bump" : undefined} />
      <span key={shown} className={cn("tabular-nums", lively && "like-count-in")}>
        {shown}
      </span>
    </button>
  );
}

/** A little longer than the report form's way out (`.report-panel` in styles/motion/forms.css). */
const REPORT_EXIT_MS = 140;

/** Report and Delete are quiet pills; `.post-action` (styles/motion/forms.css) fades their colours and gives them a press. */
const QUIET_ACTION = "post-action inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium hover:bg-sand hover:text-ink";

/**
 * The row under a thread or a reply: like, report, delete. The report form
 * opens under the row, so the buttons in the row never move.
 */
export function PostActions({
  type,
  id,
  count,
  liked,
  signedIn,
  canReport = false,
  canDelete = false,
  className,
}: {
  type: "thread" | "post";
  id: number;
  count: number;
  liked: boolean;
  signedIn: boolean;
  canReport?: boolean;
  canDelete?: boolean;
  className?: string;
}) {
  const [wanted, setWanted] = useState(false);
  const [state, action, pending] = useActionState(reportAction, EMPTY);
  const answers = useAnswerCount(state);
  const reduced = useReducedMotion();
  const open = wanted && !state.ok;
  // The form stays mounted while it closes, and is gone from the page afterwards.
  const panel = usePresence(open, reduced ? 0 : REPORT_EXIT_MS);
  const panelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = () => {
    setWanted(false);
    trigger.current?.focus();
  };

  return (
    <footer className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <LikeButton type={type} id={id} count={count} liked={liked} disabled={!signedIn} />
        {canReport &&
          (state.ok ? (
            <span className="enter-fade text-sm font-medium text-ink-3">{state.message}</span>
          ) : (
            <button
              ref={trigger}
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              className={cn(QUIET_ACTION, open ? "bg-sand text-ink" : "text-ink-3")}
              onClick={() => setWanted(!wanted)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setWanted(false);
              }}
            >
              <Icon name="flag" size={14} /> Report
            </button>
          ))}
        {canDelete && <DeletePostButton id={id} />}
      </div>
      {canReport && (
        <Collapse id={panelId} open={open} className="report-panel">
          {panel.mounted && (
            <form
              action={action}
              data-state={panel.state}
              className="motion-fade mt-3 flex w-full flex-wrap items-center gap-2 rounded-2xl bg-sand p-3"
              onKeyDown={(event) => {
                if (event.key === "Escape") cancel();
              }}
            >
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="id" value={id} />
              <label className="sr-only" htmlFor={`report-${type}-${id}`}>
                What is wrong with this post?
              </label>
              <input id={`report-${type}-${id}`} name="reason" className="input h-10 min-w-0 flex-1 text-sm" maxLength={500} placeholder="What is wrong with it? (optional)" />
              <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
                <SubmitLabel pending={pending} idle="Send report" />
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>
                Cancel
              </button>
              {/* Not the thank-you: the form is still here for a moment while it closes. */}
              {state.message && !state.ok && (
                <p key={answers} className="field-error shake w-full">
                  {state.message}
                </p>
              )}
            </form>
          )}
        </Collapse>
      )}
    </footer>
  );
}

export function DeletePostButton({ id }: { id: number }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) {
    return (
      <button type="button" className={cn(QUIET_ACTION, "text-ink-3")} onClick={() => setConfirm(true)}>
        <Icon name="trash" size={14} /> Delete
      </button>
    );
  }
  return (
    <form action={deleteOwnPostAction} className="delete-confirm inline-flex min-h-9 items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <span className="text-sm text-ink-2">Delete this reply?</span>
      <ConfirmDelete />
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>
        Keep
      </button>
    </form>
  );
}

/** The red button of the delete confirmation, with a spinner while the reply is being removed. */
function ConfirmDelete() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-danger btn-sm" disabled={pending}>
      <SubmitLabel pending={pending} idle="Delete" />
    </button>
  );
}
