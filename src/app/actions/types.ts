/** Result shape for forms driven by useActionState. */
export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  /**
   * What the user typed, echoed back on failure. React resets a form after its
   * action runs, so inputs use these as defaultValue to keep their contents.
   */
  values?: Record<string, string>;
};

/** Collects the named text fields from a submission (never passwords). */
export function echo(formData: FormData, names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of names) {
    const v = formData.get(name);
    if (typeof v === "string") out[name] = v.slice(0, 8000);
  }
  return out;
}

export const EMPTY: FormState = {};
