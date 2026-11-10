"use client";

import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CM_PER_IN, cmToFtIn, ftInToCm, kgToLb, lbToKg, round, type Tone } from "@/lib/calc";

/* ---------------- Unit preference ---------------- */

export type Units = "metric" | "imperial";
const KEY = "hm:units";
const EVENT = "hm:units-change";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function read(): Units {
  try {
    return window.localStorage.getItem(KEY) === "imperial" ? "imperial" : "metric";
  } catch {
    return "metric";
  }
}

export function useUnits(): [Units, (u: Units) => void] {
  const units = useSyncExternalStore(subscribe, read, () => "metric" as Units);
  const set = (u: Units) => {
    try {
      window.localStorage.setItem(KEY, u);
    } catch {
      /* storage blocked */
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [units, set];
}

export function UnitToggle({ className }: { className?: string }) {
  const [units, setUnits] = useUnits();
  return (
    <div role="group" aria-label="Units" className={cn("inline-flex rounded-full border-[1.5px] border-ink bg-paper p-0.5 text-sm font-semibold", className)}>
      {(["metric", "imperial"] as const).map((u) => (
        <button
          key={u}
          type="button"
          aria-pressed={units === u}
          onClick={() => setUnits(u)}
          className={cn("rounded-full px-3.5 py-1.5 transition-colors", units === u ? "bg-ink text-paper" : "text-ink-2 hover:text-ink")}
        >
          {u === "metric" ? "Metric" : "US units"}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Fields ---------------- */

export function Field({ label, hint, children, htmlFor, className }: { label: string; hint?: string; children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {children}
      {hint && <p className="field-help">{hint}</p>}
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  suffix,
  id,
  min,
  max,
  step = "any",
  placeholder,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  id?: string;
  min?: number;
  max?: number;
  step?: number | "any";
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className={cn("input h-12 text-lg font-medium tabular-nums", suffix && "pr-14")}
      />
      {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-3">{suffix}</span>}
    </div>
  );
}

const num = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const show = (v: number | null, dp = 1) => (v === null ? "" : String(round(v, dp)));

/**
 * Weight in kg or lb. The parent always holds kilograms.
 * Render with `key={units}` so the text resets when the unit changes.
 */
export function WeightInput({ kg, onChange, units, label = "Weight", hint }: { kg: number | null; onChange: (kg: number | null) => void; units: Units; label?: string; hint?: string }) {
  const id = useId();
  const [text, setText] = useState(() => show(kg === null ? null : units === "metric" ? kg : kgToLb(kg)));
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <NumberInput
        id={id}
        value={text}
        suffix={units === "metric" ? "kg" : "lb"}
        min={0}
        onChange={(v) => {
          setText(v);
          const n = num(v);
          onChange(n === null ? null : units === "metric" ? n : lbToKg(n));
        }}
      />
    </Field>
  );
}

/** Height in cm, or feet and inches. The parent always holds centimeters. */
export function HeightInput({ cm, onChange, units, label = "Height" }: { cm: number | null; onChange: (cm: number | null) => void; units: Units; label?: string }) {
  const id = useId();
  const initial = cm === null ? null : cmToFtIn(cm);
  const [text, setText] = useState(() => show(cm, 0));
  const [ft, setFt] = useState(() => (initial ? String(initial.ft) : ""));
  const [inch, setInch] = useState(() => (initial ? String(initial.inch) : ""));

  if (units === "metric") {
    return (
      <Field label={label} htmlFor={id}>
        <NumberInput
          id={id}
          value={text}
          suffix="cm"
          min={0}
          onChange={(v) => {
            setText(v);
            onChange(num(v));
          }}
        />
      </Field>
    );
  }
  const update = (f: string, i: string) => {
    const fn = num(f);
    const inn = num(i) ?? 0;
    onChange(fn === null ? null : ftInToCm(fn, inn));
  };
  return (
    <Field label={label} htmlFor={id}>
      <div className="grid grid-cols-2 gap-2">
        <NumberInput
          id={id}
          value={ft}
          suffix="ft"
          min={0}
          step={1}
          ariaLabel={`${label}, feet`}
          onChange={(v) => {
            setFt(v);
            update(v, inch);
          }}
        />
        <NumberInput
          value={inch}
          suffix="in"
          min={0}
          max={11.9}
          ariaLabel={`${label}, inches`}
          onChange={(v) => {
            setInch(v);
            update(ft, v);
          }}
        />
      </div>
    </Field>
  );
}

/** A body measurement in cm or inches. The parent always holds centimeters. */
export function LengthInput({ cm, onChange, units, label, hint }: { cm: number | null; onChange: (cm: number | null) => void; units: Units; label: string; hint?: string }) {
  const id = useId();
  const [text, setText] = useState(() => show(cm === null ? null : units === "metric" ? cm : cm / CM_PER_IN));
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <NumberInput
        id={id}
        value={text}
        suffix={units === "metric" ? "cm" : "in"}
        min={0}
        onChange={(v) => {
          setText(v);
          const n = num(v);
          onChange(n === null ? null : units === "metric" ? n : n * CM_PER_IN);
        }}
      />
    </Field>
  );
}

export function Segmented<T extends string>({ label, options, value, onChange, className }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <fieldset className={className}>
      <legend className="field-label">{label}</legend>
      <div className="inline-flex flex-wrap gap-1 rounded-2xl border-[1.5px] border-line-strong bg-paper p-1">
        {options.map((o) => (
          <label key={o.value} className={cn("cursor-pointer rounded-xl px-4 py-2 text-[0.9375rem] font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--blue-solid)]", value === o.value ? "bg-ink text-paper" : "text-ink-2 hover:bg-sand")}>
            <input type="radio" className="sr-only" name={label} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A list of radio "cards" for choices that need a line of explanation. */
export function ChoiceList<T extends string>({ label, options, value, onChange }: { label: string; options: readonly { key: T; label: string; detail: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="grid gap-2">
        {options.map((o) => (
          <label
            key={o.key}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--blue-solid)]",
              value === o.key ? "border-ink bg-tone-soft" : "border-line-strong hover:border-ink-3",
            )}
          >
            <input type="radio" className="sr-only" name={label} value={o.key} checked={value === o.key} onChange={() => onChange(o.key)} />
            <span className={cn("flex size-5 flex-none items-center justify-center rounded-full border-[1.5px] border-ink", value === o.key && "bg-ink")}>
              {value === o.key && <span className="size-2 rounded-full bg-paper" />}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold leading-tight">{o.label}</span>
              <span className="block text-sm text-ink-3">{o.detail}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* ---------------- Results ---------------- */

const TONE_CLASS: Record<Tone, string> = {
  good: "tone-lime",
  watch: "tone-yellow",
  high: "tone-orange",
  low: "tone-sky",
  urgent: "tone-pink",
};

export function Result({ tone = "good", label, value, unit, verdict, children, className }: { tone?: Tone; label: string; value: ReactNode; unit?: string; verdict?: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn(TONE_CLASS[tone], "rounded-[24px] border-[1.5px] border-ink bg-tone-soft p-6 text-tone-ink", className)} role="status" aria-live="polite">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="text-[clamp(2.75rem,8vw,4.25rem)] font-medium leading-none tracking-[-0.04em] text-ink tabular-nums">{value}</span>
        {unit && <span className="text-lg font-semibold">{unit}</span>}
      </p>
      {verdict && <p className="mt-3 inline-flex rounded-full bg-ink px-3 py-1 text-sm font-semibold text-paper">{verdict}</p>}
      {children && <div className="mt-4 space-y-2 text-[0.9375rem] leading-relaxed">{children}</div>}
    </div>
  );
}

export function EmptyResult({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-[24px] border-[1.5px] border-dashed border-line-strong p-6 text-center text-ink-3">
      <p className="max-w-[28ch]">{children}</p>
    </div>
  );
}

const BAND_BG: Record<Tone, string> = {
  good: "var(--lime-solid)",
  watch: "var(--yellow-solid)",
  high: "var(--orange-solid)",
  low: "var(--sky-solid)",
  urgent: "var(--pink-solid)",
};

/** A segmented scale with a marker, for values such as BMI. */
export function ScaleBar({ bands, value, min, max }: { bands: { label: string; from: number; to: number; tone: Tone }[]; value: number; min: number; max: number }) {
  const pct = (v: number) => ((Math.min(Math.max(v, min), max) - min) / (max - min)) * 100;
  return (
    <div className="mt-5" aria-hidden="true">
      <div className="relative h-4">
        <div className="flex h-full overflow-hidden rounded-full border-[1.5px] border-ink">
          {bands.map((b) => (
            <div key={b.label} style={{ width: `${pct(Math.min(b.to, max)) - pct(Math.max(b.from, min))}%`, background: BAND_BG[b.tone] }} />
          ))}
        </div>
        <div className="absolute -top-1.5 h-7 w-1.5 -translate-x-1/2 rounded-full bg-ink ring-2 ring-white transition-[left] duration-300" style={{ left: `${pct(value)}%` }} />
      </div>
      <div className="mt-2 flex text-[0.6875rem] font-semibold leading-tight text-ink-2">
        {bands.map((b) => (
          <div key={b.label} className="truncate pr-1" style={{ width: `${pct(Math.min(b.to, max)) - pct(Math.max(b.from, min))}%` }}>
            {b.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl bg-paper p-4">
      <p className="text-xs font-semibold text-ink-3">{label}</p>
      <p className="mt-1 text-2xl font-medium tracking-[-0.03em] tabular-nums">{value}</p>
      {sub && <p className="text-xs text-ink-3">{sub}</p>}
    </div>
  );
}

export const parseNum = num;
export const fmt = (v: number, dp = 0) => {
  const fixed = round(v, dp).toFixed(dp);
  const [int, frac] = fixed.split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (frac ? `.${frac}` : "");
};
