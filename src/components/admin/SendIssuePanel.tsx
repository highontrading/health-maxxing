"use client";

import { useActionState } from "react";
import { EMPTY } from "@/app/actions/types";
import { sendIssueAction, sendTestIssueAction } from "@/app/admin/actions";
import { Icon } from "@/components/Icon";
import { ConfirmSubmit } from "./ConfirmSubmit";

type Status = { configured: boolean; published: boolean; subscribers: number; sent: number; remaining: number };

/** Emailing a newsletter issue: a test to yourself first, then the whole list. */
export function SendIssuePanel({ issueId, status, defaultTo }: { issueId: number; status: Status; defaultTo: string }) {
  const [test, testAction, testing] = useActionState(sendTestIssueAction, EMPTY);
  const [send, sendAction, sending] = useActionState(sendIssueAction, EMPTY);

  if (!status.configured) {
    return (
      <div className="admin-card mb-5 p-5">
        <h2 className="text-[1.0625rem] font-semibold">Send by email</h2>
        <p className="mt-1.5 max-w-[75ch] text-[0.9375rem] text-ink-2">
          Email is not connected yet, so publishing this issue adds it to the web archive only. To send it to your {status.subscribers.toLocaleString("en-US")}{" "}
          {status.subscribers === 1 ? "subscriber" : "subscribers"}, set <code className="rounded bg-sand-2 px-1">SMTP_URL</code> and <code className="rounded bg-sand-2 px-1">EMAIL_FROM</code> on the server (the README explains how), or download the list under Subscribers and send from the email tool you already use.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-card mb-5 p-5">
      <h2 className="text-[1.0625rem] font-semibold">Send by email</h2>
      <p className="mt-1 text-sm text-ink-3">
        {status.sent
          ? `Sent to ${status.sent.toLocaleString("en-US")} so far. ${status.remaining.toLocaleString("en-US")} active ${status.remaining === 1 ? "subscriber has" : "subscribers have"} not had it.`
          : `${status.subscribers.toLocaleString("en-US")} active ${status.subscribers === 1 ? "subscriber" : "subscribers"}. Save your changes before sending: the email uses the saved version.`}
      </p>
      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <form action={testAction}>
          <input type="hidden" name="id" value={issueId} />
          <label htmlFor="test-to" className="field-label">
            1. Send yourself a test
          </label>
          <div className="flex gap-2">
            <input id="test-to" name="to" type="email" className="input min-w-0 flex-1" defaultValue={test.values?.to ?? defaultTo} required />
            <button type="submit" className="btn btn-outline" disabled={testing}>
              {testing ? "Sending…" : "Send test"}
            </button>
          </div>
          {(test.errors?.to || test.message) && (
            <p role={test.ok ? "status" : "alert"} className={test.ok ? "mt-1.5 text-sm font-semibold text-[var(--green-ink)]" : "field-error"}>
              {test.errors?.to ?? test.message}
            </p>
          )}
        </form>
        <form action={sendAction}>
          <input type="hidden" name="id" value={issueId} />
          <p className="field-label">2. Send to the list</p>
          {sending ? (
            <p className="text-sm text-ink-2">Sending… keep this tab open.</p>
          ) : status.remaining && status.published ? (
            <ConfirmSubmit className="btn btn-primary" confirmClassName="btn btn-primary" confirm={`Yes, email ${status.remaining.toLocaleString("en-US")} ${status.remaining === 1 ? "person" : "people"}`}>
              <Icon name="mail" size={16} /> {status.sent ? "Continue sending" : `Send to ${status.remaining.toLocaleString("en-US")} ${status.remaining === 1 ? "subscriber" : "subscribers"}`}
            </ConfirmSubmit>
          ) : (
            <p className="text-sm text-ink-2">{status.published ? "Everyone on the list has this issue." : "Set the issue to Published and save it first."}</p>
          )}
          {send.message && !sending && (
            <p role={send.ok ? "status" : "alert"} className={send.ok ? "mt-1.5 text-sm font-semibold text-[var(--green-ink)]" : "field-error"}>
              {send.message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
