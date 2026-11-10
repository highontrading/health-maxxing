"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { changePasswordAction, signInAction, signUpAction, updateProfileAction } from "@/app/actions/auth";
import { EMPTY } from "@/app/actions/types";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { useQueryParam } from "@/lib/hooks";

/** Reads ?next= on the client so auth pages can stay static. */
function useNext(): string {
  return useQueryParam("next") ?? "";
}

export function SignInForm({ area = "site" }: { area?: "site" | "admin" }) {
  const [state, action, pending] = useActionState(signInAction, EMPTY);
  const next = useNext();
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="area" value={area} />
      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" className="input" required defaultValue={state.values?.email} />
      </div>
      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" className="input" required />
      </div>
      {state.message && (
        <p role="alert" className="field-error">
          {state.message}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, EMPTY);
  const next = useNext();
  const err = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
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
          {err.name && <p className="field-error">{err.name}</p>}
        </div>
        <div>
          <label htmlFor="handle" className="field-label">
            Handle
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3">@</span>
            <input id="handle" name="handle" className="input pl-8" autoComplete="username" maxLength={20} required aria-invalid={!!err.handle} autoCapitalize="none" spellCheck={false} defaultValue={state.values?.handle} />
          </div>
          {err.handle ? <p className="field-error">{err.handle}</p> : <p className="field-help">Letters, numbers and underscores.</p>}
        </div>
      </div>
      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" className="input" required aria-invalid={!!err.email} defaultValue={state.values?.email} />
        {err.email ? <p className="field-error">{err.email}</p> : <p className="field-help">Never shown publicly.</p>}
      </div>
      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" className="input" required minLength={8} aria-invalid={!!err.password} />
        {err.password ? <p className="field-error">{err.password}</p> : <p className="field-help">At least 8 characters.</p>}
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-[0.9375rem] leading-snug">
        <input type="checkbox" name="agree" className="mt-0.5 size-5 flex-none accent-[var(--ink)]" />
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
      {err.agree && <p className="field-error">{err.agree}</p>}
      {state.message && (
        <p role="alert" className="field-error">
          {state.message}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
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
  const err = state.errors ?? {};
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="sticker" value={sticker} />
      <input type="hidden" name="color" value={color} />
      <div className="flex items-center gap-4">
        <span className={cn(`tone-${color}`, "flex size-20 flex-none items-center justify-center rounded-full bg-tone-soft")}>
          <Sticker name={sticker} size={54} />
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor="p-name" className="field-label">
            Display name
          </label>
          <input id="p-name" name="name" className="input" defaultValue={state.values?.name ?? user.name} maxLength={40} required />
          {err.name && <p className="field-error">{err.name}</p>}
        </div>
      </div>
      <fieldset>
        <legend className="field-label">Your sticker</legend>
        <div className="flex flex-wrap gap-1.5">
          {AVATAR_STICKERS.map((s) => (
            <button key={s} type="button" aria-label={`Use the ${s} sticker`} aria-pressed={sticker === s} onClick={() => setSticker(s)} className={cn("flex size-11 items-center justify-center rounded-xl border-[1.5px]", sticker === s ? "border-ink bg-sand" : "border-transparent hover:bg-sand")}>
              <Sticker name={s} size={30} flat />
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="field-label">Background</legend>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => (
            <button key={c} type="button" aria-label={`Use ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} className={cn(`tone-${c}`, "size-9 rounded-full bg-tone-soft ring-offset-2", color === c ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-line-strong")} />
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="p-bio" className="field-label">
          About you (optional)
        </label>
        <textarea id="p-bio" name="bio" rows={3} className="textarea min-h-0" defaultValue={state.values?.bio ?? user.bio} maxLength={280} />
        {err.bio && <p className="field-error">{err.bio}</p>}
      </div>
      {state.message && (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm font-semibold text-[var(--green-ink)]" : "field-error"}>
          {state.message}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

export function PasswordForm({ minLength = 8 }: { minLength?: number }) {
  const [state, action, pending] = useActionState(changePasswordAction, EMPTY);
  const err = state.errors ?? {};
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="pw-current" className="field-label">
          Current password
        </label>
        <input id="pw-current" name="current" type="password" autoComplete="current-password" className="input" required />
        {err.current && <p className="field-error">{err.current}</p>}
      </div>
      <div>
        <label htmlFor="pw-new" className="field-label">
          New password
        </label>
        <input id="pw-new" name="password" type="password" autoComplete="new-password" className="input" required minLength={minLength} />
        {err.password ? <p className="field-error">{err.password}</p> : <p className="field-help">At least {minLength} characters.</p>}
      </div>
      {state.message && (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm font-semibold text-[var(--green-ink)]" : "field-error"}>
          {state.message}
        </p>
      )}
      <button type="submit" className="btn btn-outline" disabled={pending}>
        {pending ? "Updating…" : "Change password"}
      </button>
    </form>
  );
}
