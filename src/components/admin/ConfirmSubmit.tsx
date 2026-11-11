"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A submit button that asks once before it submits. Use inside a <form> for
 * anything that deletes or cannot be undone.
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
  if (!armed) {
    return (
      <button type="button" className={className} title={title} onClick={() => setArmed(true)}>
        {children}
      </button>
    );
  }
  // The pair fades in without moving (admin-confirm), so the second click lands where it was aimed.
  return (
    <span className="admin-confirm inline-flex items-center gap-1">
      <button type="submit" name={name} value={value} className={confirmClassName} autoFocus onBlur={() => setArmed(false)}>
        {confirm}
      </button>
      <button type="button" className={cn("btn btn-ghost btn-sm")} onClick={() => setArmed(false)}>
        No
      </button>
    </span>
  );
}
