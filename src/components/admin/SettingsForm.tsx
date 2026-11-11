"use client";

import { useActionState } from "react";
import { EMPTY } from "@/app/actions/types";
import { saveSettingsAction } from "@/app/admin/actions";
import { SETTING_SECTIONS } from "@/lib/admin/settings-fields";
import type { SettingsGroup } from "@/lib/settings";
import { useAnswerCount } from "./motion";

type Value = string | number | boolean | string[];

/** One form for the listed setting groups. `values` is keyed "group.key". */
export function SettingsForm({ groups, values, submitLabel = "Save settings" }: { groups: SettingsGroup[]; values: Record<string, Value>; submitLabel?: string }) {
  // A long form keeps its save button in view; a single short section does not need that.
  const sticky = groups.length > 1;
  const [state, action, pending] = useActionState(saveSettingsAction, EMPTY);
  // The messages are keyed by this, so every save answers with a fresh fade, even when the words repeat.
  const answer = useAnswerCount(state);
  const errors = state.errors ?? {};
  const sections = SETTING_SECTIONS.filter((s) => groups.includes(s.group));

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="_groups" value={groups.join(",")} />
      {sections.map((section) => (
        <section key={section.group} className="admin-card p-5">
          {sections.length > 1 && (
            <>
              <h2 className="text-[1.0625rem] font-semibold">{section.title}</h2>
              <p className="mb-4 mt-0.5 text-sm text-ink-3">{section.blurb}</p>
            </>
          )}
          <div className="max-w-2xl space-y-4">
            {section.fields.map((f) => {
              const name = `${section.group}.${f.key}`;
              const echoed = state.values?.[name];
              const stored = values[name];
              const error = errors[name];
              const note = error ? (
                <p key={answer} className="field-error admin-result" role="alert">
                  {error}
                </p>
              ) : (
                f.help && <p className="field-help">{f.help}</p>
              );
              if (f.kind === "boolean") {
                return (
                  <div key={name}>
                    <label className="flex cursor-pointer items-center gap-3 text-[0.9375rem] font-medium">
                      <input type="checkbox" name={name} defaultChecked={echoed !== undefined ? echoed === "on" : stored === true} className="size-5 flex-none accent-[var(--ink)]" />
                      {f.label}
                    </label>
                    {note}
                  </div>
                );
              }
              const text = echoed ?? (Array.isArray(stored) ? stored.join("\n") : String(stored ?? ""));
              return (
                <div key={name}>
                  <label htmlFor={name} className="field-label">
                    {f.label}
                  </label>
                  {f.kind === "select" ? (
                    <select id={name} name={name} className="select" defaultValue={text} aria-invalid={!!error || undefined}>
                      {(f.options ?? []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.kind === "textarea" || f.kind === "lines" ? (
                    <textarea id={name} name={name} rows={f.rows ?? 3} className="textarea min-h-0" defaultValue={text} placeholder={f.placeholder} aria-invalid={!!error || undefined} />
                  ) : (
                    <input
                      id={name}
                      name={name}
                      type={f.kind === "number" ? "number" : "text"}
                      className={f.kind === "number" ? "input w-32" : "input"}
                      defaultValue={text}
                      placeholder={f.placeholder}
                      aria-invalid={!!error || undefined}
                    />
                  )}
                  {note}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <div className={sticky ? "sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-paper/95 p-3 shadow-[var(--shadow-card)] backdrop-blur" : "flex flex-wrap items-center gap-3"}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {state.message && (
          <p key={answer} role={state.ok ? "status" : "alert"} className={state.ok ? "admin-result text-sm font-semibold text-[var(--green-ink)]" : "admin-result text-sm font-medium text-[#c21f48]"}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
