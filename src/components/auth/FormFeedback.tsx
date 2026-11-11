"use client";

import { useState, type ReactNode } from "react";
import type { FormState } from "@/app/actions/types";
import { Spinner } from "@/components/motion/Spinner";
import { cn } from "@/lib/cn";

/**
 * Feedback shared by the forms on the public site (sign-in, account, forum,
 * contact, newsletter). Fields and labels never move; the words around them
 * do. The styles are in `src/app/styles/motion/forms.css`. Put `site-form` on
 * the <form> so a field the server sent back (`aria-invalid`) fades to a pink
 * border.
 */

/**
 * How many answers the form's action has given so far. Use it as a React key
 * on one-shot feedback, so the same message plays again after another try.
 */
export function useAnswerCount(state: FormState): number {
  const [seen, setSeen] = useState(state);
  const [count, setCount] = useState(0);
  if (seen !== state) {
    setSeen(state);
    setCount(count + 1);
  }
  return count;
}

/**
 * The answer to the whole form, shown under its fields. A problem (wrong
 * password, rate limit) arrives with one small nudge, again on every failed
 * try. With `ok`, it is good news instead and rises in. Renders nothing while
 * the action has no message.
 */
export function FormMessage({ state, ok = false, className, children }: { state: FormState; ok?: boolean; className?: string; children?: ReactNode }) {
  const answers = useAnswerCount(state);
  if (!state.message) return null;
  return (
    <p key={answers} role={ok ? "status" : "alert"} className={cn(ok ? "form-status-in text-sm font-semibold text-[var(--green-ink)]" : "field-error shake", className)}>
      {state.message}
      {children}
    </p>
  );
}

/** What is wrong with one field, shown under it. It rises in; the field itself stays still. */
export function FieldError({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <p id={id} className={cn("field-error field-error-in", className)}>
      {children}
    </p>
  );
}

/**
 * Scrolls to `el` when the sticky header or the edge of the window hides part
 * of it, as little as needed (a jump under reduced motion). Returns false when
 * it was already in full view. For the answer to a form that lands off screen:
 * a new reply, or a confirmation that is shorter than the form it replaces.
 */
export function bringIntoView(el: HTMLElement): boolean {
  const { top, bottom } = el.getBoundingClientRect();
  // The page's scroll padding is the room the sticky header needs.
  const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  if (top >= header && bottom <= window.innerHeight) return false;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block: "nearest", behavior: calm ? "instant" : "smooth" });
  return true;
}

/** A `ref` for an element that should be in view as soon as it appears. */
export function intoViewOnMount(el: HTMLElement | null): void {
  if (el) bringIntoView(el);
}

/**
 * The words on a submit button. While the form is on its way it shows a
 * spinner and `busy`; the button keeps one width for both wordings. Without
 * `busy` the spinner takes the label's place for a moment.
 */
export function SubmitLabel({ pending, idle, busy }: { pending: boolean; idle: string; busy?: string }) {
  if (busy === undefined) {
    return (
      <span className="submit-label">
        <span className={pending ? "submit-label-waiting" : undefined}>{idle}</span>
        {pending && <Spinner size={16} />}
      </span>
    );
  }
  return (
    <span className="submit-label" data-idle={idle} data-busy={busy}>
      {pending ? (
        <span key="busy" className="submit-label-busy">
          <Spinner size={16} />
          {busy}
        </span>
      ) : (
        <span key="idle">{idle}</span>
      )}
    </span>
  );
}
