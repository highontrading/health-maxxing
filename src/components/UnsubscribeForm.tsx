"use client";

import Link from "next/link";
import { useActionState } from "react";
import { unsubscribeAction } from "@/app/actions/newsletter";
import { EMPTY } from "@/app/actions/types";
import { useQueryParam } from "@/lib/hooks";

/** Reads the token from ?token= and confirms the unsubscribe with one click. */
export function UnsubscribeForm() {
  const [state, action, pending] = useActionState(unsubscribeAction, EMPTY);
  const token = useQueryParam("token");

  if (state.ok) {
    return (
      <div role="status">
        <p className="text-xl font-medium">{state.message}</p>
        <Link href="/" className="btn btn-outline mt-6">
          Back to the site
        </Link>
      </div>
    );
  }
  if (token === null) return <p className="text-ink-3">Loading…</p>;
  if (!token) {
    return <p className="text-ink-2">This page needs the unsubscribe link from one of our emails. If you cannot find it, contact us and we will remove you.</p>;
  }
  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      <p className="text-ink-2">Click below and we will stop emailing you straight away.</p>
      <button type="submit" className="btn btn-primary btn-lg mt-6" disabled={pending}>
        {pending ? "Unsubscribing…" : "Unsubscribe me"}
      </button>
      {state.message && (
        <p role="alert" className="field-error mt-3">
          {state.message}
        </p>
      )}
    </form>
  );
}
