"use client";

import { useActionState, useState } from "react";
import { EMPTY } from "@/app/actions/types";
import { uploadMediaAction } from "@/app/admin/actions";
import { Icon } from "@/components/Icon";
import { Spinner } from "@/components/motion/Spinner";
import { useAnswerCount } from "./motion";

export function MediaUploader() {
  const [state, action, pending] = useActionState(uploadMediaAction, EMPTY);
  const answer = useAnswerCount(state);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
      <div>
        <label htmlFor="media-file" className="field-label">
          Image
        </label>
        <input id="media-file" name="file" type="file" required accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="input h-auto py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-paper" />
      </div>
      <div>
        <label htmlFor="media-alt" className="field-label">
          What it shows (for screen readers)
        </label>
        <input id="media-alt" name="alt" className="input" maxLength={200} placeholder="A bowl of oats with berries" />
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? <Spinner /> : <Icon name="upload" size={16} />} {pending ? "Uploading…" : "Upload"}
      </button>
      {state.message && (
        <p key={answer} role={state.ok ? "status" : "alert"} className={state.ok ? "admin-result text-sm font-semibold text-[var(--green-ink)] sm:col-span-3" : "field-error admin-result sm:col-span-3"}>
          {state.message} {state.ok && state.values?.url ? `It is at ${state.values.url}` : ""}
        </p>
      )}
    </form>
  );
}

/** Copies text to the clipboard and says so. */
export function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          window.prompt("Copy this:", text);
        }
      }}
    >
      {copied ? (
        // "Copied" fades in over the label it replaces (admin-swap). No pop: this is the admin.
        <span className="admin-swap inline-flex items-center gap-2">
          <Icon name="check" size={14} /> Copied
        </span>
      ) : (
        <>
          <Icon name="copy" size={14} /> {label}
        </>
      )}
    </button>
  );
}
