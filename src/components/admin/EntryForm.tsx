"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { EMPTY } from "@/app/actions/types";
import { deleteEntryAction, saveEntryAction } from "@/app/admin/actions";
import { Icon } from "@/components/Icon";
import { getCollection, type FieldDef, type Option } from "@/lib/admin/collections";
import { cn } from "@/lib/cn";
import { ColorPicker, DateTimeField, ImageField, MarkdownEditor, Repeatable, StickerPicker, type RepeatColumn } from "./fields";

type Props = {
  collectionKey: string;
  id: number | null;
  initial: Record<string, unknown>;
  options: { categories: Option[]; systems: Option[] };
  /** Address of the live page, when the entry is published and has one. */
  publicUrl?: string | null;
  /** Small facts about the row shown beside the save button. */
  facts?: { label: string; value: string }[];
};

const SOURCE_COLUMNS: RepeatColumn[] = [
  { key: "title", label: "Title of the page or paper", span: "col-span-12 sm:col-span-7" },
  { key: "publisher", label: "Publisher", placeholder: "Publisher (e.g. NHS)", span: "col-span-8 sm:col-span-3" },
  { key: "year", label: "Year", kind: "number", span: "col-span-4 sm:col-span-2" },
  { key: "url", label: "Link", kind: "url", placeholder: "https://", span: "col-span-12" },
];
const FAQ_COLUMNS: RepeatColumn[] = [
  { key: "q", label: "Question" },
  { key: "a", label: "Answer", kind: "textarea" },
];
const MICRO_COLUMNS: RepeatColumn[] = [
  { key: "name", label: "Nutrient", placeholder: "Vitamin C", span: "col-span-6" },
  { key: "amount", label: "Amount", kind: "number", span: "col-span-3" },
  { key: "unit", label: "Unit", kind: "select", options: ["mg", "mcg", "g", "IU"], span: "col-span-3" },
];

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asRows = (v: unknown) => asArray(v).filter((r) => r && typeof r === "object") as Record<string, unknown>[];

function Control({ field, value, echoed, options, invalid }: { field: FieldDef; value: unknown; echoed: string | undefined; options: Props["options"]; invalid: boolean }) {
  const str = echoed ?? (value == null ? "" : String(value));
  const common = { id: field.name, name: field.name, "aria-invalid": invalid || undefined, "aria-describedby": `${field.name}-note` };
  switch (field.type) {
    case "text":
      return <input {...common} className="input" defaultValue={str} maxLength={field.max} placeholder={field.placeholder} required={field.required} />;
    case "textarea":
      return <textarea {...common} className="textarea min-h-0" rows={field.rows ?? 3} defaultValue={str} maxLength={field.max} placeholder={field.placeholder} required={field.required} />;
    case "markdown":
      return <MarkdownEditor name={field.name} initial={str} rows={field.rows} invalid={invalid} />;
    case "number":
      return <input {...common} type="number" inputMode="decimal" className="input" defaultValue={str} min={field.min} max={field.max} step={field.step ?? "any"} required={field.required} />;
    case "boolean":
      return (
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] border-line-strong bg-paper px-3 py-2.5 text-[0.9375rem] font-medium">
          <input type="checkbox" name={field.name} defaultChecked={echoed !== undefined ? echoed === "on" : value === true} className="size-5 flex-none accent-[var(--ink)]" />
          {field.label}
        </label>
      );
    case "select": {
      const list = field.optionsFrom === "categories" ? options.categories : field.optionsFrom === "systems" ? options.systems : (field.options ?? []);
      const known = list.some((o) => o.value === str);
      return (
        <select {...common} className="select" defaultValue={str} required={field.required}>
          {(!known || !field.required) && <option value="">{str && !known ? `Unknown (${str})` : "Choose…"}</option>}
          {list.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    case "sticker":
      return <StickerPicker name={field.name} initial={str} />;
    case "color":
      return <ColorPicker name={field.name} initial={str} colors={(field.options ?? []).map((o) => o.value)} />;
    case "lines":
      return (
        <textarea
          {...common}
          className="textarea min-h-0"
          rows={field.rows ?? 5}
          defaultValue={echoed ?? asArray(value).join("\n")}
          placeholder={field.placeholder ?? "One per line"}
        />
      );
    case "csv":
      return <input {...common} className="input" defaultValue={echoed ?? asArray(value).join(", ")} placeholder={field.placeholder ?? "Separated by commas"} />;
    case "sources":
      return <Repeatable name={field.name} initial={asRows(value)} columns={SOURCE_COLUMNS} addLabel="Add a source" numbered />;
    case "faqs":
      return <Repeatable name={field.name} initial={asRows(value)} columns={FAQ_COLUMNS} addLabel="Add a question" max={12} />;
    case "micros":
      return <Repeatable name={field.name} initial={asRows(value)} columns={MICRO_COLUMNS} addLabel="Add a nutrient" max={8} />;
    case "datetime":
      return <DateTimeField name={field.name} initial={typeof value === "string" && value ? value : null} />;
    case "image":
      return <ImageField name={field.name} initial={value == null ? "" : String(value)} />;
  }
}

function FieldRow({ field, value, echoed, error, options }: { field: FieldDef; value: unknown; echoed: string | undefined; error?: string; options: Props["options"] }) {
  const isCheckbox = field.type === "boolean";
  // Custom controls are not a single input, so their caption is a plain heading.
  const labelled = ["text", "textarea", "number", "select", "lines", "csv", "markdown", "datetime", "image"].includes(field.type);
  return (
    <div id={`field-${field.name}`}>
      {!isCheckbox &&
        (labelled ? (
          <label htmlFor={field.name} className="field-label">
            {field.label}
            {field.required && <span className="text-ink-3"> (required)</span>}
          </label>
        ) : (
          <p className="field-label">{field.label}</p>
        ))}
      <Control field={field} value={value} echoed={echoed} options={options} invalid={!!error} />
      <div id={`${field.name}-note`}>
        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : (
          field.help && <p className="field-help">{field.help}</p>
        )}
      </div>
    </div>
  );
}

export function EntryForm({ collectionKey, id, initial, options, publicUrl, facts = [] }: Props) {
  const def = getCollection(collectionKey)!;
  const [state, formAction, pending] = useActionState(saveEntryAction, EMPTY);
  // dirty: there are unsaved changes. touched: something changed since the last save attempt.
  const [dirty, setDirty] = useState(false);
  const [touched, setTouched] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const errors = state.errors ?? {};
  const errorNames = Object.keys(errors);

  // When a save attempt comes back, update the flags (adjusting state while rendering, not in an effect).
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    setTouched(false);
    if (state.ok) setDirty(false);
  }
  const edited = () => {
    setDirty(true);
    setTouched(true);
  };
  const failed = !state.ok && (errorNames.length > 0 || !!state.message);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        form.current?.requestSubmit();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const main = def.fields.filter((f) => !f.side);
  const side = def.fields.filter((f) => f.side);
  const sections: { title: string; fields: FieldDef[] }[] = [];
  for (const f of main) {
    const title = f.section ?? "";
    const last = sections[sections.length - 1];
    if (last && last.title === title) last.fields.push(f);
    else sections.push({ title, fields: [f] });
  }
  const row = (f: FieldDef) => <FieldRow key={f.name} field={f} value={initial[f.name]} echoed={state.values?.[f.name]} error={errors[f.name]} options={options} />;
  const slugNow = state.values?.slug || (typeof initial.slug === "string" ? initial.slug : "");

  return (
    <form
      ref={form}
      action={formAction}
      onChange={edited}
      onInput={edited}
      className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]"
      noValidate
    >
      <input type="hidden" name="_collection" value={def.key} />
      <input type="hidden" name="_id" value={id ?? ""} />

      <div className="min-w-0 space-y-5">
        {errorNames.length > 0 && (
          <div role="alert" className="rounded-2xl border-[1.5px] border-[#c21f48] bg-[var(--pink-soft)] p-4 text-[var(--pink-ink)]">
            <p className="font-semibold">{state.message}</p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {errorNames.map((name) => (
                <li key={name}>
                  <a href={`#field-${name}`} className="underline underline-offset-2">
                    {def.fields.find((f) => f.name === name)?.label ?? name}
                  </a>
                  : {errors[name]}
                </li>
              ))}
            </ul>
          </div>
        )}
        {sections.map((s, i) =>
          s.title ? (
            <details key={s.title} className="admin-card group" open={i < 2 || s.fields.some((f) => errors[f.name]) || s.title === "Evidence" || s.title === "Per 100 g"}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                {s.title}
                <Icon name="chevron-down" size={18} className="text-ink-3 transition-transform group-open:rotate-180" />
              </summary>
              <div className={cn("space-y-5 px-5 pb-5", s.title === "Per 100 g" && "grid gap-x-4 gap-y-4 space-y-0 sm:grid-cols-2 [&>div:last-child]:sm:col-span-2")}>{s.fields.map(row)}</div>
            </details>
          ) : (
            <div key={`plain-${i}`} className="admin-card space-y-5 p-5">
              {s.fields.map(row)}
            </div>
          ),
        )}
      </div>

      <aside className="space-y-5 xl:sticky xl:top-5">
        <div className="admin-card p-4">
          <div className="flex items-center gap-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={pending}>
              {pending ? "Saving…" : id ? "Save changes" : `Create ${def.singular}`}
            </button>
            {publicUrl && (
              <Link href={publicUrl} target="_blank" className="btn btn-outline px-3" aria-label="View on the site (opens in a new tab)" title="View on the site">
                <Icon name="external" size={18} />
              </Link>
            )}
          </div>
          <p className="mt-2.5 min-h-5 text-sm" role="status">
            {pending ? (
              <span className="text-ink-3">Saving…</span>
            ) : failed && !touched ? (
              <span className="font-medium text-[#c21f48]">{errorNames.length ? "Not saved. See the list above." : state.message}</span>
            ) : dirty ? (
              <span className="font-medium text-[var(--orange-ink)]">Unsaved changes</span>
            ) : state.ok ? (
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--green-ink)]">
                <Icon name="check" size={16} /> Saved
              </span>
            ) : (
              <span className="text-ink-3">{id ? "No changes yet" : "Fill in the form, then create."}</span>
            )}
          </p>
          {facts.length > 0 && (
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              {facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-3">
                  <dt className="text-ink-3">{f.label}</dt>
                  <dd className="text-right font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {id && slugNow && def.publicPath && (
            <p className="mt-3 break-all border-t border-line pt-3 text-xs text-ink-3">{def.publicPath.replace("{slug}", slugNow)}</p>
          )}
        </div>

        <div className="admin-card space-y-4 p-4">{side.map(row)}</div>

        {id && (
          <div className="admin-card p-4">
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Delete this {def.singular} for good? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button type="submit" formAction={deleteEntryAction} formNoValidate className="btn btn-danger btn-sm">
                    Yes, delete
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
                    Keep it
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="inline-flex items-center gap-2 text-sm font-medium text-ink-3 hover:text-[#c21f48]" onClick={() => setConfirmDelete(true)}>
                <Icon name="trash" size={16} /> Delete this {def.singular}
              </button>
            )}
          </div>
        )}
      </aside>
    </form>
  );
}
