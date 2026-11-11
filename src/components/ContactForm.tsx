"use client";

import { useActionState } from "react";
import { contactAction } from "@/app/actions/newsletter";
import { EMPTY } from "@/app/actions/types";
import { FieldError, FormMessage, intoViewOnMount, SubmitLabel } from "@/components/auth/FormFeedback";
import { Icon } from "@/components/Icon";
import { stagger } from "@/components/motion/stagger";
import { Sticker } from "@/components/stickers/Sticker";

export function ContactForm() {
  const [state, action, pending] = useActionState(contactAction, EMPTY);

  if (state.ok) {
    // The panel rises in, then the sticker pops (`.contact-done` in styles/motion/forms.css). It is much
    // shorter than the form, so without the scroll it can end up half under the header.
    return (
      <div ref={intoViewOnMount} role="status" className="contact-done flex flex-col items-center rounded-[26px] bg-[var(--lime-soft)] px-6 py-14 text-center text-[var(--lime-ink)]">
        <Sticker name="mail" size={84} rotate={-8} className="enter-pop" style={stagger(3)} />
        <p className="mt-5 text-2xl font-medium tracking-[-0.02em]">Message sent.</p>
        <p className="mt-2 max-w-sm">{state.message}</p>
      </div>
    );
  }

  const err = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="site-form space-y-5" noValidate>
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="field-label">
            Your name
          </label>
          <input id="c-name" name="name" className="input" autoComplete="name" required defaultValue={v.name} aria-invalid={!!err.name} aria-describedby={err.name ? "c-name-err" : undefined} />
          {err.name && <FieldError id="c-name-err">{err.name}</FieldError>}
        </div>
        <div>
          <label htmlFor="c-email" className="field-label">
            Email
          </label>
          <input id="c-email" name="email" type="email" className="input" autoComplete="email" required defaultValue={v.email} aria-invalid={!!err.email} aria-describedby={err.email ? "c-email-err" : undefined} />
          {err.email && <FieldError id="c-email-err">{err.email}</FieldError>}
        </div>
      </div>
      <div>
        <label htmlFor="c-subject" className="field-label">
          What is it about?
        </label>
        <select id="c-subject" name="subject" className="select" defaultValue={v.subject || "Question"}>
          <option>Question</option>
          <option>Correction or error report</option>
          <option>Topic suggestion</option>
          <option>Community or moderation</option>
          <option>Privacy or data request</option>
          <option>Something else</option>
        </select>
      </div>
      <div>
        <label htmlFor="c-message" className="field-label">
          Message
        </label>
        <textarea id="c-message" name="message" rows={7} className="textarea" required defaultValue={v.message} aria-invalid={!!err.message} aria-describedby={err.message ? "c-message-err" : "c-message-help"} />
        {err.message ? (
          <FieldError id="c-message-err">{err.message}</FieldError>
        ) : (
          <p id="c-message-help" className="field-help">For corrections, include the page link and, if you can, a source.</p>
        )}
      </div>
      <FormMessage state={state} />
      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        <SubmitLabel pending={pending} idle="Send message" busy="Sending…" /> <Icon name="arrow-right" size={18} className="nudge-x" />
      </button>
    </form>
  );
}
