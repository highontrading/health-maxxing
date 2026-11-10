"use client";

import { useActionState } from "react";
import { subscribeAction } from "@/app/actions/newsletter";
import { EMPTY } from "@/app/actions/types";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";

/** Email capture. `dark` is for charcoal backgrounds. */
export function NewsletterForm({ source = "site", dark = false, className, cta = "Subscribe" }: { source?: string; dark?: boolean; className?: string; cta?: string }) {
  const [state, action, pending] = useActionState(subscribeAction, EMPTY);

  if (state.ok) {
    return (
      <p
        role="status"
        className={cn(
          "inline-flex items-center gap-2.5 rounded-full px-5 py-3.5 font-semibold",
          dark ? "bg-lime text-ink" : "bg-lime-soft text-[var(--lime-ink)]",
          className,
        )}
      >
        <Icon name="check" size={20} strokeWidth={3} /> {state.message}
      </p>
    );
  }

  return (
    <form action={action} className={cn("w-full max-w-md", className)} noValidate>
      <input type="hidden" name="source" value={source} />
      {/* Honeypot: real people never see or fill this. */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full border-[1.5px] p-1.5 pl-5 transition-shadow focus-within:shadow-[0_0_0_4px_var(--lime-soft)]",
          dark ? "border-white/25 bg-white/10 focus-within:border-lime focus-within:shadow-[0_0_0_4px_rgba(196,240,74,0.25)]" : "border-ink bg-paper",
        )}
      >
        <label className="sr-only" htmlFor={`nl-${source}`}>
          Email address
        </label>
        <input
          id={`nl-${source}`}
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={cn("h-11 min-w-0 flex-1 bg-transparent text-base outline-none", dark ? "text-paper placeholder:text-white/50" : "placeholder:text-ink-3")}
        />
        <button type="submit" disabled={pending} className={cn("btn flex-none", dark ? "btn-lime" : "btn-primary")}>
          {pending ? "Adding…" : cta}
        </button>
      </div>
      {state.message && (
        <p role="alert" className={cn("mt-2 pl-5 text-sm font-medium", dark ? "text-[#ff9db4]" : "text-[#c21f48]")}>
          {state.message}
        </p>
      )}
      <p className={cn("mt-2.5 pl-5 text-xs", dark ? "text-white/55" : "text-ink-3")}>Free. No spam. Unsubscribe in one click.</p>
    </form>
  );
}
