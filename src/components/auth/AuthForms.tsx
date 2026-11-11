"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { changePasswordAction, requestPasswordResetAction, resetPasswordAction, signInAction, signUpAction, updateProfileAction } from "@/app/actions/auth";
import { EMPTY } from "@/app/actions/types";
import { Icon } from "@/components/Icon";
import { Spinner } from "@/components/motion/Spinner";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { useQueryParam } from "@/lib/hooks";
import { FieldError, FormMessage, SubmitLabel } from "./FormFeedback";

/** Reads ?next= on the client so auth pages can stay static. */
function useNext(): string {
  return useQueryParam("next") ?? "";
}

export function SignInForm({ area = "site" }: { area?: "site" | "admin" }) {
  const [state, action, pending] = useActionState(signInAction, EMPTY);
  // Ids of their own: the sign-up page can be in the document too (hidden, kept for Back), with the same fields.
  const uid = useId();
  const next = useNext();
  const justReset = useQueryParam("reset") === "1";
  return (
    <form action={action} className="site-form space-y-4" noValidate>
      {justReset && !state.message && (
        <p role="status" className="form-status-in rounded-2xl bg-[var(--lime-soft)] px-4 py-3 text-sm font-semibold text-[var(--lime-ink)]">
          Your password has been changed. Sign in with the new one.
        </p>
      )}
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="area" value={area} />
      <div>
        <label htmlFor={`${uid}-email`} className="field-label">
          Email
        </label>
        <input id={`${uid}-email`} name="email" type="email" autoComplete="email" className="input" required defaultValue={state.values?.email} />
      </div>
      <div>
        <label htmlFor={`${uid}-password`} className="field-label">
          Password
        </label>
        <input id={`${uid}-password`} name="password" type="password" autoComplete="current-password" className="input" required />
      </div>
      <FormMessage state={state} />
      <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
        <SubmitLabel pending={pending} idle="Sign in" busy="Signing in…" />
      </button>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, EMPTY);
  const uid = useId();
  const next = useNext();
  const err = state.errors ?? {};
  return (
    <form action={action} className="site-form space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="field-label">
            Display name
          </label>
          <input id="name" name="name" className="input" autoComplete="nickname" maxLength={40} required aria-invalid={!!err.name} defaultValue={state.values?.name} />
          {err.name && <FieldError>{err.name}</FieldError>}
        </div>
        <div>
          <label htmlFor="handle" className="field-label">
            Handle
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3">@</span>
            <input id="handle" name="handle" className="input pl-8" autoComplete="username" maxLength={20} required aria-invalid={!!err.handle} autoCapitalize="none" spellCheck={false} defaultValue={state.values?.handle} />
          </div>
          {err.handle ? <FieldError>{err.handle}</FieldError> : <p className="field-help">Letters, numbers and underscores.</p>}
        </div>
      </div>
      <div>
        <label htmlFor={`${uid}-email`} className="field-label">
          Email
        </label>
        <input id={`${uid}-email`} name="email" type="email" autoComplete="email" className="input" required aria-invalid={!!err.email} defaultValue={state.values?.email} />
        {err.email ? <FieldError>{err.email}</FieldError> : <p className="field-help">Never shown publicly.</p>}
      </div>
      <div>
        <label htmlFor={`${uid}-password`} className="field-label">
          Password
        </label>
        <input id={`${uid}-password`} name="password" type="password" autoComplete="new-password" className="input" required minLength={8} aria-invalid={!!err.password} />
        {err.password ? <FieldError>{err.password}</FieldError> : <p className="field-help">At least 8 characters.</p>}
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-[0.9375rem] leading-snug">
        <input type="checkbox" name="agree" className="mt-0.5 size-5 flex-none accent-[var(--ink)]" defaultChecked={state.values?.agree === "on"} />
        <span>
          I agree to the{" "}
          <Link href="/community-guidelines" className="font-semibold underline underline-offset-4" target="_blank">
            community guidelines
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="font-semibold underline underline-offset-4" target="_blank">
            terms
          </Link>
          .
        </span>
      </label>
      {err.agree && <FieldError>{err.agree}</FieldError>}
      <FormMessage state={state} />
      <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
        <SubmitLabel pending={pending} idle="Create account" busy="Creating your account…" />
      </button>
    </form>
  );
}

const AVATAR_STICKERS = ["smile", "sun", "moon", "leaf", "bolt", "flower", "apple", "avocado", "sneaker", "lotus", "star", "cloud", "heart", "brain", "dumbbell", "coffee", "egg", "sparkle"];
const AVATAR_COLORS = ["lime", "orange", "indigo", "lilac", "pink", "yellow", "teal", "sky", "peach", "mint", "rose", "blue"];

export function ProfileForm({ user }: { user: { name: string; bio: string; sticker: string; color: string } }) {
  const [state, action, pending] = useActionState(updateProfileAction, EMPTY);
  const [sticker, setSticker] = useState(user.sticker);
  const [color, setColor] = useState(user.color);
  // The preview sticker pops only after a choice, never when the page opens.
  const [picked, setPicked] = useState(false);
  const err = state.errors ?? {};
  return (
    <form action={action} className="site-form space-y-5">
      <input type="hidden" name="sticker" value={sticker} />
      <input type="hidden" name="color" value={color} />
      <div className="flex items-center gap-4">
        <span className={cn(`tone-${color}`, "flex size-20 flex-none items-center justify-center rounded-full bg-tone-soft transition-colors duration-(--dur-base)")}>
          <Sticker key={sticker} name={sticker} size={54} className={picked ? "enter-pop" : undefined} />
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor="p-name" className="field-label">
            Display name
          </label>
          <input id="p-name" name="name" className="input" defaultValue={state.values?.name ?? user.name} maxLength={40} required aria-invalid={!!err.name || undefined} />
          {err.name && <FieldError>{err.name}</FieldError>}
        </div>
      </div>
      <fieldset>
        <legend className="field-label">Your sticker</legend>
        <div className="flex flex-wrap gap-1.5">
          {AVATAR_STICKERS.map((s) => (
            <button
              key={s}
              type="button"
              aria-label={`Use the ${s} sticker`}
              aria-pressed={sticker === s}
              onClick={() => {
                setSticker(s);
                setPicked(true);
              }}
              className={cn("avatar-pick flex size-11 items-center justify-center rounded-xl border-[1.5px]", sticker === s ? "border-ink bg-sand" : "border-transparent hover:bg-sand")}
            >
              <Sticker name={s} size={30} flat />
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="field-label">Background</legend>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => (
            <button key={c} type="button" aria-label={`Use ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} className={cn(`tone-${c}`, "avatar-pick size-9 rounded-full bg-tone-soft ring-offset-2", color === c ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-line-strong")} />
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="p-bio" className="field-label">
          About you (optional)
        </label>
        <textarea id="p-bio" name="bio" rows={3} className="textarea min-h-0" defaultValue={state.values?.bio ?? user.bio} maxLength={280} aria-invalid={!!err.bio || undefined} />
        {err.bio && <FieldError>{err.bio}</FieldError>}
      </div>
      <FormMessage state={state} ok={state.ok} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        <SubmitLabel pending={pending} idle="Save profile" busy="Saving…" />
      </button>
    </form>
  );
}

export function PasswordForm({ minLength = 8 }: { minLength?: number }) {
  const [state, action, pending] = useActionState(changePasswordAction, EMPTY);
  const err = state.errors ?? {};
  return (
    <form action={action} className="site-form space-y-4">
      <div>
        <label htmlFor="pw-current" className="field-label">
          Current password
        </label>
        <input id="pw-current" name="current" type="password" autoComplete="current-password" className="input" required aria-invalid={!!err.current || undefined} />
        {err.current && <FieldError>{err.current}</FieldError>}
      </div>
      <div>
        <label htmlFor="pw-new" className="field-label">
          New password
        </label>
        <input id="pw-new" name="password" type="password" autoComplete="new-password" className="input" required minLength={minLength} aria-invalid={!!err.password || undefined} />
        {err.password ? <FieldError>{err.password}</FieldError> : <p className="field-help">At least {minLength} characters.</p>}
      </div>
      <FormMessage state={state} ok={state.ok} />
      <button type="submit" className="btn btn-outline" disabled={pending}>
        <SubmitLabel pending={pending} idle="Change password" busy="Updating…" />
      </button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, EMPTY);
  if (state.ok) {
    return (
      <p role="status" className="form-status-in rounded-2xl bg-[var(--lime-soft)] px-4 py-4 font-medium text-[var(--lime-ink)]">
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="site-form space-y-4" noValidate>
      <div>
        <label htmlFor="fp-email" className="field-label">
          Email
        </label>
        <input id="fp-email" name="email" type="email" autoComplete="email" className="input" required defaultValue={state.values?.email} aria-invalid={!!state.errors?.email || undefined} />
        {state.errors?.email && <FieldError>{state.errors.email}</FieldError>}
      </div>
      <FormMessage state={state} />
      <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
        <SubmitLabel pending={pending} idle="Email me a reset link" busy="Sending…" />
      </button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, EMPTY);
  const token = useQueryParam("token");
  if (token === null) return <p className="text-ink-3">Loading…</p>;
  if (!token) {
    return (
      <p className="text-ink-2">
        This page needs the link from a password reset email.{" "}
        <Link href="/forgot-password" className="font-semibold text-ink underline underline-offset-4">
          Ask for a new link
        </Link>
        .
      </p>
    );
  }
  return (
    <form action={action} className="site-form space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="rp-password" className="field-label">
          New password
        </label>
        <input id="rp-password" name="password" type="password" autoComplete="new-password" className="input" required minLength={8} />
        <p className="field-help">At least 8 characters. Staff accounts need 10.</p>
      </div>
      <FormMessage state={state}>
        {" "}
        <Link href="/forgot-password" className="underline underline-offset-4">
          Get a new link
        </Link>
      </FormMessage>
      <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
        <SubmitLabel pending={pending} idle="Set new password" busy="Saving…" />
      </button>
    </form>
  );
}

/** The sign-out button of a `<form action={signOutAction}>`. Its icon turns into a spinner while the request is on its way. */
export function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-outline" disabled={pending}>
      {pending ? <Spinner size={16} /> : <Icon name="logout" size={16} />} Sign out
    </button>
  );
}
