"use client";

import { useId, useRef, useState, useTransition } from "react";
import { previewMarkdownAction, uploadMediaAction } from "@/app/admin/actions";
import { Icon } from "@/components/Icon";
import { STICKER_ART } from "@/components/stickers/art";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { useMounted } from "@/lib/hooks";

/* ------------------------------------------------------------------ */
/* Markdown editor                                                     */
/* ------------------------------------------------------------------ */

type Insert = { label: string; icon?: string; text?: string; title: string; run: (sel: string) => { before: string; body: string; after: string } };

const wrap = (before: string, after: string, placeholder: string) => (sel: string) => ({ before, body: sel || placeholder, after });
const linePrefix = (prefix: string, placeholder: string) => (sel: string) => ({
  before: "",
  body: (sel || placeholder)
    .split("\n")
    .map((l) => `${prefix}${l}`)
    .join("\n"),
  after: "",
});
const callout = (type: string, placeholder: string) => (sel: string) => ({ before: `\n> [!${type}]\n> `, body: sel || placeholder, after: "\n" });

const TOOLS: Insert[] = [
  { label: "Bold", icon: "bold", title: "Bold", run: wrap("**", "**", "bold text") },
  { label: "Italic", icon: "italic", title: "Italic", run: wrap("*", "*", "italic text") },
  { label: "Heading", icon: "heading", title: "Section heading", run: (sel) => ({ before: "\n## ", body: sel || "Section heading", after: "\n" }) },
  { label: "Subheading", text: "H3", title: "Smaller heading", run: (sel) => ({ before: "\n### ", body: sel || "Subheading", after: "\n" }) },
  { label: "Link", icon: "link", title: "Link", run: (sel) => ({ before: "[", body: sel || "link text", after: "](https://)" }) },
  { label: "Bulleted list", icon: "list", title: "Bulleted list", run: linePrefix("- ", "List item") },
  { label: "Numbered list", text: "1.", title: "Numbered list", run: linePrefix("1. ", "List item") },
  { label: "Quote", icon: "quote", title: "Quote", run: linePrefix("> ", "Quoted text") },
  { label: "Source", text: "[1]", title: "Cite source number 1 (change the number to match the sources list)", run: () => ({ before: "", body: "[^1]", after: "" }) },
  {
    label: "Table",
    icon: "table",
    title: "Table",
    run: () => ({ before: "\n| Column | Column |\n| --- | --- |\n| ", body: "Cell", after: " | Cell |\n" }),
  },
];

const CALLOUTS: { type: string; label: string; placeholder: string }[] = [
  { type: "TIP", label: "Tip", placeholder: "A practical tip." },
  { type: "NOTE", label: "Note", placeholder: "Useful context." },
  { type: "WARNING", label: "Warning", placeholder: "Something to be careful about." },
  { type: "DOCTOR", label: "See a doctor", placeholder: "When to get medical help." },
  { type: "STAT", label: "Key number", placeholder: "**42%** of something, with its source[^1]." },
];

const countWords = (s: string) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%/-]*/gu) ?? []).length;

export function MarkdownEditor({ name, initial, rows = 22, invalid }: { name: string; initial: string; rows?: number; invalid?: boolean }) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [html, setHtml] = useState("");
  const [words, setWords] = useState(() => countWords(initial));
  const [loading, startPreview] = useTransition();

  const apply = (run: Insert["run"]) => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const { before, body, after } = run(value.slice(start, end));
    el.setRangeText(before + body + after, start, end, "end");
    el.focus();
    el.setSelectionRange(start + before.length, start + before.length + body.length);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    setWords(countWords(el.value));
  };

  const showPreview = () => {
    setTab("preview");
    const source = area.current?.value ?? "";
    startPreview(async () => {
      try {
        setHtml((await previewMarkdownAction(source)).html);
      } catch {
        setHtml("<p>The preview could not be loaded. Your text is safe; try again.</p>");
      }
    });
  };

  return (
    <div className={cn("overflow-hidden rounded-2xl border-[1.5px] bg-paper", invalid ? "border-[#c21f48]" : "border-line-strong")}>
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-sand px-2 py-1.5">
        <div role="tablist" aria-label="Editor view" className="mr-2 flex rounded-full bg-sand-2 p-0.5">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => (t === "preview" ? showPreview() : setTab("write"))}
              className={cn("rounded-full px-3 py-1 text-[0.8125rem] font-semibold capitalize", tab === t ? "bg-paper shadow-sm" : "text-ink-2 hover:text-ink")}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "write" && (
          <>
            {TOOLS.map((t) => (
              <button
                key={t.label}
                type="button"
                title={t.title}
                aria-label={t.label}
                onClick={() => apply(t.run)}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-[0.8125rem] font-bold text-ink-2 hover:bg-sand-2 hover:text-ink"
              >
                {t.icon ? <Icon name={t.icon} size={16} /> : t.text}
              </button>
            ))}
            <label className="ml-1 inline-flex items-center">
              <span className="sr-only">Insert a callout box</span>
              <select
                className="h-8 rounded-lg border border-line bg-paper px-2 text-[0.8125rem] font-semibold text-ink-2"
                value=""
                onChange={(e) => {
                  const c = CALLOUTS.find((x) => x.type === e.target.value);
                  if (c) apply(callout(c.type, c.placeholder));
                }}
              >
                <option value="">Callout box…</option>
                {CALLOUTS.map((c) => (
                  <option key={c.type} value={c.type}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <span className="ml-auto px-2 text-xs tabular-nums text-ink-3">{words.toLocaleString("en-US")} words</span>
      </div>
      {/* The textarea stays mounted while previewing, so its text is still submitted. */}
      <textarea
        ref={area}
        id={name}
        name={name}
        rows={rows}
        defaultValue={initial}
        onInput={(e) => setWords(countWords(e.currentTarget.value))}
        spellCheck
        className={cn("block w-full resize-y border-0 bg-paper px-4 py-3 font-mono text-[0.875rem] leading-relaxed outline-none", tab === "preview" && "hidden")}
      />
      {tab === "preview" && (
        <div className={cn("min-h-64 px-5 py-4 transition-opacity", loading && "opacity-50")}>
          {html ? (
            <div data-prose className="prose-hm prose-compact max-w-[70ch]" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <p className="text-sm text-ink-3">{loading ? "Rendering…" : "Nothing to preview yet."}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sticker and colour pickers                                          */
/* ------------------------------------------------------------------ */

const STICKER_NAMES = Object.keys(STICKER_ART).sort();

export function StickerPicker({ name, initial }: { name: string; initial: string }) {
  const [value, setValue] = useState(initial || "heart");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const panel = useId();
  const shown = STICKER_NAMES.filter((s) => s.includes(filter.trim().toLowerCase()));
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-line-strong bg-paper px-3 py-2 text-left hover:border-ink-3"
      >
        <Sticker name={value} size={38} flat />
        <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium capitalize">{value.replace(/-/g, " ")}</span>
        <Icon name="chevron-down" size={16} className={cn("text-ink-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div id={panel} className="mt-2 rounded-2xl border border-line bg-sand p-2">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Find a sticker"
            aria-label="Find a sticker"
            className="input mb-2 h-9 text-sm"
          />
          <div className="grid max-h-56 grid-cols-6 gap-1 overflow-y-auto">
            {shown.map((s) => (
              <button
                key={s}
                type="button"
                title={s}
                aria-label={`Use the ${s} sticker`}
                aria-pressed={value === s}
                onClick={() => {
                  setValue(s);
                  setOpen(false);
                }}
                className={cn("flex aspect-square items-center justify-center rounded-xl border-[1.5px]", value === s ? "border-ink bg-paper" : "border-transparent hover:bg-paper")}
              >
                <Sticker name={s} size={30} flat />
              </button>
            ))}
            {!shown.length && <p className="col-span-6 p-2 text-sm text-ink-3">No sticker matches.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function ColorPicker({ name, initial, colors }: { name: string; initial: string; colors: string[] }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <label key={c} title={c} className="cursor-pointer">
          <input type="radio" name={name} value={c} defaultChecked={c === initial} className="peer sr-only" />
          <span
            className={cn(
              `tone-${c}`,
              "block size-8 rounded-full border-[1.5px] border-line bg-tone-soft ring-ink ring-offset-2 peer-checked:border-ink peer-checked:ring-2 peer-focus-visible:ring-2",
            )}
          >
            <span className="sr-only">{c}</span>
            <span className="m-auto mt-[9px] block size-3 rounded-full bg-tone-solid" />
          </span>
        </label>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Repeatable rows (sources, questions, nutrients)                     */
/* ------------------------------------------------------------------ */

export type RepeatColumn = {
  key: string;
  label: string;
  kind?: "text" | "url" | "number" | "textarea" | "select";
  options?: string[];
  placeholder?: string;
  /** Tailwind column-span classes for the 12-column row grid. */
  span?: string;
};

type RepeatRow = Record<string, string>;

export function Repeatable({
  name,
  initial,
  columns,
  addLabel,
  numbered,
  max = 30,
}: {
  name: string;
  initial: Record<string, unknown>[];
  columns: RepeatColumn[];
  addLabel: string;
  numbered?: boolean;
  max?: number;
}) {
  const blank = (): RepeatRow => Object.fromEntries(columns.map((c) => [c.key, c.kind === "select" ? (c.options?.[0] ?? "") : ""]));
  const [rows, setRows] = useState<RepeatRow[]>(() =>
    initial.map((r) => Object.fromEntries(columns.map((c) => [c.key, r[c.key] == null ? "" : String(r[c.key])]))),
  );
  const update = (i: number, key: string, value: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  const move = (i: number, by: number) =>
    setRows((rs) => {
      const j = i + by;
      if (j < 0 || j >= rs.length) return rs;
      const next = [...rs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      {rows.length > 0 && (
        <ol className="space-y-2">
          {rows.map((row, i) => (
            <li key={i} className="flex gap-2 rounded-2xl bg-sand p-2.5">
              {numbered && <span className="mt-2 w-6 flex-none text-center text-sm font-bold tabular-nums text-ink-3">{i + 1}</span>}
              <div className="grid min-w-0 flex-1 grid-cols-12 gap-2">
                {columns.map((c) => {
                  const common = {
                    "aria-label": `${c.label} ${i + 1}`,
                    placeholder: c.placeholder ?? c.label,
                    value: row[c.key] ?? "",
                    className: cn(c.kind === "textarea" ? "textarea min-h-0" : c.kind === "select" ? "select" : "input", "h-auto py-2 text-sm"),
                  };
                  return (
                    <div key={c.key} className={c.span ?? "col-span-12"}>
                      {c.kind === "textarea" ? (
                        <textarea {...common} rows={3} onChange={(e) => update(i, c.key, e.target.value)} />
                      ) : c.kind === "select" ? (
                        <select {...common} onChange={(e) => update(i, c.key, e.target.value)}>
                          {(c.options ?? []).map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          {...common}
                          type={c.kind === "number" ? "number" : c.kind === "url" ? "url" : "text"}
                          step={c.kind === "number" ? "any" : undefined}
                          inputMode={c.kind === "number" ? "decimal" : undefined}
                          onChange={(e) => update(i, c.key, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-none flex-col gap-0.5">
                <button type="button" className="rounded-lg p-1.5 text-ink-3 hover:bg-sand-2 hover:text-ink disabled:opacity-30" aria-label={`Move row ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <Icon name="chevron-down" size={16} className="rotate-180" />
                </button>
                <button type="button" className="rounded-lg p-1.5 text-ink-3 hover:bg-sand-2 hover:text-ink disabled:opacity-30" aria-label={`Move row ${i + 1} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                  <Icon name="chevron-down" size={16} />
                </button>
                <button type="button" className="rounded-lg p-1.5 text-ink-3 hover:bg-[var(--pink-soft)] hover:text-[var(--pink-ink)]" aria-label={`Remove row ${i + 1}`} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <button type="button" className="btn btn-outline btn-sm mt-2" disabled={rows.length >= max} onClick={() => setRows((rs) => [...rs, blank()])}>
        <Icon name="plus" size={14} /> {addLabel}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Date and time                                                       */
/* ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, "0");
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/** Shows the editor's local time; submits UTC. */
export function DateTimeField({ name, initial }: { name: string; initial: string | null }) {
  const mounted = useMounted();
  const [typed, setTyped] = useState<string | null>(null);
  const local = typed ?? (mounted && initial ? toLocalInput(initial) : "");
  return (
    <div>
      <input type="hidden" name={name} value={typed === null ? (initial ?? "") : fromLocalInput(typed)} />
      <div className="flex gap-2">
        <input
          type="datetime-local"
          id={name}
          className="input min-w-0 flex-1"
          value={local}
          disabled={!mounted}
          onChange={(e) => setTyped(e.target.value)}
        />
        {local && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTyped("")}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Image                                                               */
/* ------------------------------------------------------------------ */

export function ImageField({ name, initial }: { name: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");
  const [busy, startUpload] = useTransition();
  const file = useRef<HTMLInputElement>(null);

  const upload = (f: File) => {
    setError("");
    startUpload(async () => {
      const fd = new FormData();
      fd.set("file", f);
      try {
        const res = await uploadMediaAction({}, fd);
        if (res.ok && res.values?.url) setValue(res.values.url);
        else setError(res.message ?? "The upload failed.");
      } catch {
        setError("The upload failed. Images must be under 4 MB.");
      }
    });
  };

  return (
    <div>
      {value && (
        <div className="mb-2 overflow-hidden rounded-2xl border border-line bg-sand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="aspect-[16/10] w-full object-cover" />
        </div>
      )}
      <input id={name} name={name} className="input text-sm" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Upload, or paste an https:// link" />
      <input
        ref={file}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => file.current?.click()}>
          <Icon name="upload" size={14} /> {busy ? "Uploading…" : "Upload image"}
        </button>
        {value && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setValue("")}>
            Remove
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
