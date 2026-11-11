"use client";

import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";

/**
 * A click this soon after the question appeared is part of the gesture that
 * asked it (a double click, a held Enter key), not an answer to it.
 */
export const CONFIRM_GUARD_MS = 400;

/** Stops a confirm button from submitting when its click is not a deliberate second decision. */
export function guardConfirm(event: MouseEvent, askedAt: number): void {
  if (event.detail > 1 || event.timeStamp - askedAt < CONFIRM_GUARD_MS) event.preventDefault();
}

/**
 * A submit button that asks once before it submits. Use inside a <form> for
 * anything that deletes or cannot be undone. "No" comes first, in the place
 * where the button was, and the confirm button ignores a click that arrives
 * with the one that asked the question, so a double click can never confirm.
 */
export function ConfirmSubmit({
  children,
  confirm = "Sure?",
  className = "btn btn-ghost btn-sm",
  confirmClassName = "btn btn-danger btn-sm",
  name,
  value,
  title,
}: {
  children: ReactNode;
  confirm?: string;
  className?: string;
  confirmClassName?: string;
  name?: string;
  value?: string;
  title?: string;
}) {
  const [armed, setArmed] = useState(false);
  // After a cancel from the keyboard, focus goes back to the button that asked.
  const [refocus, setRefocus] = useState(false);
  const askedAt = useRef(0);

  if (!armed) {
    return (
      <button
        type="button"
        className={className}
        title={title}
        autoFocus={refocus}
        onClick={(e) => {
          askedAt.current = e.timeStamp;
          setRefocus(false);
          setArmed(true);
        }}
      >
        {children}
      </button>
    );
  }
  const cancel = (toTrigger: boolean) => {
    setRefocus(toTrigger);
    setArmed(false);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    cancel(true);
  };
  // The pair fades in without moving (admin-confirm). Leaving the pair with the keyboard or a click elsewhere cancels.
  return (
    <span
      className="admin-confirm inline-flex flex-wrap items-center gap-1"
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) cancel(false);
      }}
    >
      <button type="button" className="btn btn-ghost btn-sm" autoFocus onClick={() => cancel(true)}>
        No
      </button>
      <button type="submit" name={name} value={value} className={confirmClassName} onClick={(e) => guardConfirm(e, askedAt.current)}>
        {confirm}
      </button>
    </span>
  );
}
