"use client";

import Link from "next/link";
import { useId, useMemo, useState, type ReactNode } from "react";
import * as c from "@/lib/calc";
import { cn } from "@/lib/cn";
import { useToday } from "@/lib/hooks";
import { CalculatorMotion, LiveNumber, OptionalField } from "./motion";
import { ChoiceList, EmptyResult, Field, fmt, HeightInput, LengthInput, NumberInput, parseNum, Result, ScaleBar, Segmented, SplitBar, Stat, UnitToggle, useUnits, WeightInput } from "./ui";

/**
 * Inputs on the left, result on the right (stacked on small screens).
 * CalculatorMotion follows the visitor's changes, so the first result can pop
 * in and its numbers (<LiveNumber>) can count: the rules are at the top of
 * motion.tsx. Ranges in tiles, clock times and dates stay plain text.
 */
function Layout({ inputs, result, units = true }: { inputs: ReactNode; result: ReactNode; units?: boolean }) {
  return (
    <CalculatorMotion className="grid gap-6 lg:grid-cols-2 lg:gap-8">
      <div className="space-y-5">
        {units && <UnitToggle />}
        {inputs}
      </div>
      <div className="lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">{result}</div>
    </CalculatorMotion>
  );
}

const ageOk = (a: number | null): a is number => a !== null && a >= 14 && a <= 110;

/**
 * For an <OptionalField>: it clips its content while it slides, which would
 * also cut an input's focus glow at the sides. This widens the clip by 6px
 * each side; give the content inside `px-1.5` to keep it where it was.
 */
const FIELD_BLEED = "-mx-1.5";

/* ================================================================== BMI */
function BmiCalculator() {
  const [units] = useUnits();
  const [cm, setCm] = useState<number | null>(null);
  const [kg, setKg] = useState<number | null>(null);
  const valid = cm !== null && kg !== null && cm >= 90 && cm <= 250 && kg >= 20 && kg <= 400;
  const value = valid ? c.bmi(kg, cm) : null;
  const band = value !== null ? c.bmiBand(value) : null;
  const range = valid ? c.healthyWeightRange(cm) : null;
  const w = (v: number) => (units === "metric" ? `${fmt(v, 1)} kg` : `${fmt(c.kgToLb(v), 0)} lb`);

  return (
    <Layout
      inputs={
        <>
          <HeightInput key={`h-${units}`} cm={cm} onChange={setCm} units={units} />
          <WeightInput key={`w-${units}`} kg={kg} onChange={setKg} units={units} />
        </>
      }
      result={
        value !== null && band && range ? (
          <Result tone={band.tone} label="Your BMI" value={<LiveNumber value={value} decimals={1} />} verdict={band.label}>
            <ScaleBar
              min={15}
              max={40}
              value={value}
              bands={[
                { label: "Under", from: 15, to: 18.5, tone: "low" },
                { label: "Healthy", from: 18.5, to: 25, tone: "good" },
                { label: "Over", from: 25, to: 30, tone: "watch" },
                { label: "Obesity", from: 30, to: 40, tone: "high" },
              ]}
            />
            <p>
              A healthy-range BMI for your height is roughly <strong>{w(range[0])}</strong> to <strong>{w(range[1])}</strong>.
            </p>
            <p>
              BMI cannot see muscle or where fat sits. Check your <Link href="/tools/waist-to-height" className="font-semibold underline underline-offset-2">waist-to-height ratio</Link> too.
            </p>
          </Result>
        ) : (
          <EmptyResult>Enter your height and weight to see your BMI.</EmptyResult>
        )
      }
    />
  );
}

/* ================================================================== TDEE */
function TdeeCalculator() {
  const [units] = useUnits();
  const [sex, setSex] = useState<c.Sex>("female");
  const [age, setAge] = useState("");
  const [cm, setCm] = useState<number | null>(null);
  const [kg, setKg] = useState<number | null>(null);
  const [activity, setActivity] = useState<string>("light");
  const a = parseNum(age);
  const valid = ageOk(a) && cm !== null && kg !== null && cm >= 90 && cm <= 250 && kg >= 20 && kg <= 400;
  const bmr = valid ? c.bmrMifflin(sex, kg, cm, a) : null;
  const total = bmr !== null ? c.tdee(bmr, activity) : null;
  const ageId = useId();

  return (
    <Layout
      inputs={
        <>
          <Segmented label="Sex (for the equation)" value={sex} onChange={setSex} options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }]} />
          <Field label="Age" htmlFor={ageId}>
            <NumberInput id={ageId} value={age} onChange={setAge} suffix="years" min={14} max={110} step={1} />
          </Field>
          <HeightInput key={`h-${units}`} cm={cm} onChange={setCm} units={units} />
          <WeightInput key={`w-${units}`} kg={kg} onChange={setKg} units={units} />
          <ChoiceList label="Activity level" options={c.ACTIVITY_LEVELS} value={activity as (typeof c.ACTIVITY_LEVELS)[number]["key"]} onChange={setActivity} />
        </>
      }
      result={
        bmr !== null && total !== null ? (
          <Result tone="good" label="Estimated daily burn" value={<LiveNumber value={total} />} unit="kcal a day">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="At rest (BMR)" value={<LiveNumber value={bmr} />} sub="kcal a day" />
              <Stat label="Gentle loss" value={<LiveNumber value={total - 250} />} sub="about 250 kcal under" />
              <Stat label="Steady loss" value={<LiveNumber value={Math.max(total - 500, bmr * 0.9)} />} sub="about 500 kcal under" />
              <Stat label="Slow gain" value={<LiveNumber value={total + 250} />} sub="about 250 kcal over" />
            </div>
            <p>Equations like this are usually within about 10%. Use it as a starting point and adjust to what your weight actually does over two to three weeks.</p>
          </Result>
        ) : (
          <EmptyResult>Fill in your details to estimate your daily calorie needs.</EmptyResult>
        )
      }
    />
  );
}

/* ================================================================== Macros */
function MacroCalculator() {
  const [units] = useUnits();
  const [kcal, setKcal] = useState("2000");
  const [kg, setKg] = useState<number | null>(null);
  const [style, setStyle] = useState<string>("balanced");
  const k = parseNum(kcal);
  const valid = k !== null && k >= 800 && k <= 8000 && kg !== null && kg >= 20 && kg <= 400;
  const m = valid ? c.macroSplit(k, kg, style) : null;
  const kcalId = useId();
  const rows = m
    ? [
        { name: "Protein", g: m.protein, pct: m.proteinPct, color: "var(--pink-solid)" },
        { name: "Carbohydrate", g: m.carbs, pct: m.carbsPct, color: "var(--yellow-solid)" },
        { name: "Fat", g: m.fat, pct: m.fatPct, color: "var(--blue-solid)" },
      ]
    : [];

  return (
    <Layout
      inputs={
        <>
          <Field label="Daily calories" htmlFor={kcalId} hint="Not sure? Work it out with the calorie needs calculator.">
            <NumberInput id={kcalId} value={kcal} onChange={setKcal} suffix="kcal" min={800} max={8000} step={50} />
          </Field>
          <WeightInput key={`w-${units}`} kg={kg} onChange={setKg} units={units} label="Body weight" />
          <ChoiceList label="Eating style" options={c.MACRO_STYLES} value={style as (typeof c.MACRO_STYLES)[number]["key"]} onChange={setStyle} />
        </>
      }
      result={
        m ? (
          <Result
            tone="good"
            label="Daily targets"
            value={
              <>
                <LiveNumber value={m.protein} /> g
              </>
            }
            unit="protein"
          >
            <SplitBar parts={rows} />
            <table className="w-full text-left text-[0.9375rem]">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="border-b border-ink/15 last:border-0">
                    <th scope="row" className="py-2 font-semibold">
                      <span className="mr-2 inline-block size-2.5 rounded-full" style={{ background: r.color }} />
                      {r.name}
                    </th>
                    <td className="py-2 text-right font-semibold tabular-nums">
                      <LiveNumber value={r.g} /> g
                    </td>
                    <td className="w-16 py-2 text-right tabular-nums opacity-80">
                      <LiveNumber value={r.pct} />%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Treat these as targets to land near, not numbers to hit exactly. Food quality matters more than the split.</p>
          </Result>
        ) : (
          <EmptyResult>Enter your calories and weight to see a macro split.</EmptyResult>
        )
      }
    />
  );
}

/* ================================================================== Protein */
function ProteinCalculator() {
  const [units] = useUnits();
  const [kg, setKg] = useState<number | null>(null);
  const [goal, setGoal] = useState<string>("active");
  const valid = kg !== null && kg >= 20 && kg <= 400;
  const r = valid ? c.proteinRange(kg, goal) : null;

  return (
    <Layout
      inputs={
        <>
          <WeightInput key={`w-${units}`} kg={kg} onChange={setKg} units={units} label="Body weight" hint="If you carry a lot of extra weight, use a weight closer to your goal." />
          <ChoiceList label="Your goal" options={c.PROTEIN_GOALS} value={goal as (typeof c.PROTEIN_GOALS)[number]["key"]} onChange={setGoal} />
        </>
      }
      result={
        r ? (
          <Result
            tone="good"
            label="Daily protein"
            value={
              <span className="whitespace-nowrap">
                <LiveNumber value={r.min} />–<LiveNumber value={r.max} />
              </span>
            }
            unit="g a day"
          >
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Per kilogram" value={`${r.goal.min}–${r.goal.max}`} sub="g per kg body weight" />
              <Stat label="Per meal" value={`${fmt(r.perMealMin, 0)}–${fmt(r.perMealMax, 0)} g`} sub="across 3 to 4 meals" />
            </div>
            <p>For scale: an egg has about 6 g, a 150 g pot of Greek yogurt about 15 g, and 100 g of cooked chicken breast about 31 g.</p>
            <p>If you have kidney disease, follow your own clinician&apos;s advice on protein.</p>
          </Result>
        ) : (
          <EmptyResult>Enter your weight to see your protein range.</EmptyResult>
        )
      }
    />
  );
}

/* ================================================================== Water */
function WaterCalculator() {
  const [units] = useUnits();
  const [kg, setKg] = useState<number | null>(null);
  const [minutes, setMinutes] = useState("30");
  const [hot, setHot] = useState<"no" | "yes">("no");
  const mins = parseNum(minutes) ?? 0;
  const valid = kg !== null && kg >= 20 && kg <= 400 && mins <= 600;
  const r = valid ? c.waterRange(kg, mins, hot === "yes") : null;
  const id = useId();
  // Liters or fluid ounces. A change of unit swaps the figure at once (snapKey): nothing was measured again.
  const vol = (l: number) => <LiveNumber value={units === "metric" ? l : l * 33.814} decimals={units === "metric" ? 1 : 0} snapKey={units} />;

  return (
    <Layout
      inputs={
        <>
          <WeightInput key={`w-${units}`} kg={kg} onChange={setKg} units={units} label="Body weight" />
          <Field label="Exercise today" htmlFor={id}>
            <NumberInput id={id} value={minutes} onChange={setMinutes} suffix="min" min={0} max={600} step={5} />
          </Field>
          <Segmented label="Hot or humid weather?" value={hot} onChange={setHot} options={[{ value: "no", label: "No" }, { value: "yes", label: "Yes" }]} />
        </>
      }
      result={
        r ? (
          <Result
            tone="low"
            label="Fluids from all drinks"
            value={
              <span className="whitespace-nowrap">
                {vol(r.min)}–{vol(r.max)}
              </span>
            }
            unit={units === "metric" ? "liters a day" : "fl oz a day"}
          >
            <div className="grid grid-cols-2 gap-2">
              <Stat label="In glasses" value={`${fmt(r.min / 0.25, 0)}–${fmt(r.max / 0.25, 0)}`} sub="of about 250 mL (8 fl oz)" />
              <Stat label="Quick check" value="Pale yellow" sub="urine color to aim for" />
            </div>
            <p>A rough guide, not a quota. Tea, coffee, milk and watery foods all count, and thirst is a reliable signal for most healthy adults.</p>
          </Result>
        ) : (
          <EmptyResult>Enter your weight for a daily fluid range.</EmptyResult>
        )
      }
    />
  );
}

/* ================================================================== Heart rate zones */
const ZONE_BG: Record<string, string> = {
  sky: "var(--sky-soft)",
  green: "var(--green-soft)",
  yellow: "var(--yellow-soft)",
  orange: "var(--orange-soft)",
  pink: "var(--pink-soft)",
};
function HeartRateCalculator() {
  const [age, setAge] = useState("");
  const [rest, setRest] = useState("");
  const a = parseNum(age);
  const r = parseNum(rest);
  const zones = ageOk(a) ? c.heartRateZones(a, r ?? undefined) : null;
  const ageId = useId();
  const restId = useId();

  return (
    <Layout
      units={false}
      inputs={
        <>
          <Field label="Age" htmlFor={ageId}>
            <NumberInput id={ageId} value={age} onChange={setAge} suffix="years" min={14} max={110} step={1} />
          </Field>
          <Field label="Resting heart rate (optional)" htmlFor={restId} hint="Count your pulse for a minute after waking, or use your watch's reading. Adding it makes the zones more personal.">
            <NumberInput id={restId} value={rest} onChange={setRest} suffix="bpm" min={30} max={120} step={1} />
          </Field>
        </>
      }
      result={
        zones ? (
          <Result tone="urgent" label="Estimated maximum heart rate" value={<LiveNumber value={zones.max} />} unit="bpm">
            <table className="w-full overflow-hidden rounded-2xl text-left text-[0.9375rem]">
              <caption className="sr-only">Training zones</caption>
              <tbody>
                {zones.zones.map((z) => (
                  <tr key={z.zone} style={{ background: ZONE_BG[z.color] }} className="border-b-2 border-[var(--pink-soft)] text-ink last:border-0">
                    <th scope="row" className="w-10 py-2.5 pl-3 font-bold">Z{z.zone}</th>
                    <td className="py-2.5">
                      <span className="block font-semibold leading-tight">{z.label}</span>
                      <span className="block text-xs opacity-75">{z.feel}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold tabular-nums whitespace-nowrap">
                      {z.from}–{z.to}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>{zones.method === "reserve" ? "Calculated with the heart rate reserve method, using your resting rate." : "Calculated as a percentage of maximum heart rate. Add your resting rate for sharper zones."}</p>
          </Result>
        ) : (
          <EmptyResult>Enter your age to see your five training zones.</EmptyResult>
        )
      }
    />
  );
}

/* ================================================================== One-rep max */
function OneRepMaxCalculator() {
  const [units] = useUnits();
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("5");
  const w = parseNum(weight);
  const r = parseNum(reps);
  const valid = w !== null && w > 0 && w <= 1000 && r !== null && r >= 1 && r <= 20 && Number.isInteger(r);
  const est = valid ? c.oneRepMax(w, r) : null;
  const unit = units === "metric" ? "kg" : "lb";
  const wid = useId();
  const rid = useId();
  const step = units === "metric" ? 2.5 : 5;
  const snap = (v: number) => Math.round(v / step) * step;

  return (
    <Layout
      inputs={
        <>
          <Field label="Weight lifted" htmlFor={wid}>
            <NumberInput id={wid} value={weight} onChange={setWeight} suffix={unit} min={0} />
          </Field>
          <Field label="Reps completed" htmlFor={rid} hint="Use a hard set of 1 to 10 reps for the best estimate.">
            <NumberInput id={rid} value={reps} onChange={setReps} suffix="reps" min={1} max={20} step={1} />
          </Field>
        </>
      }
      result={
        est ? (
          <Result tone="high" label="Estimated one-rep max" value={<LiveNumber value={est.average} />} unit={unit}>
            <div className="grid grid-cols-2 gap-2">
              <Stat
                label="Epley formula"
                value={
                  <>
                    <LiveNumber value={est.epley} decimals={1} /> {unit}
                  </>
                }
              />
              <Stat
                label="Brzycki formula"
                value={
                  <>
                    <LiveNumber value={est.brzycki} decimals={1} /> {unit}
                  </>
                }
              />
            </div>
            <table className="w-full text-left text-[0.9375rem]">
              <caption className="pb-1 text-left text-xs font-semibold uppercase tracking-wide opacity-70">Loading chart</caption>
              <thead>
                <tr className="border-b border-ink/25 text-xs">
                  <th className="py-1.5 font-semibold">% of max</th>
                  <th className="py-1.5 text-right font-semibold">Load</th>
                  <th className="py-1.5 text-right font-semibold">Typical reps</th>
                </tr>
              </thead>
              <tbody>
                {c.LOAD_CHART.map((row) => (
                  <tr key={row.pct} className="border-b border-ink/10 last:border-0">
                    <td className="py-1.5 tabular-nums">{row.pct}%</td>
                    <td className="py-1.5 text-right font-semibold tabular-nums">
                      <LiveNumber value={snap((est.average * row.pct) / 100)} decimals={units === "metric" ? 1 : 0} snapKey={units} /> {unit}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{row.reps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Result>
        ) : (
          <EmptyResult>Enter a weight and the reps you managed with it.</EmptyResult>
        )
      }
    />
  );
}

/* ================================================================== Body fat */
function BodyFatCalculator() {
  const [units] = useUnits();
  const [sex, setSex] = useState<c.Sex>("female");
  const [height, setHeight] = useState<number | null>(null);
  const [neck, setNeck] = useState<number | null>(null);
  const [waist, setWaist] = useState<number | null>(null);
  const [hip, setHip] = useState<number | null>(null);
  const [kg, setKg] = useState<number | null>(null);
  const ready = height !== null && neck !== null && waist !== null && (sex === "male" || hip !== null) && height >= 90 && height <= 250;
  const pct = ready ? c.navyBodyFat({ sex, heightCm: height, neckCm: neck, waistCm: waist, hipCm: hip ?? undefined }) : null;
  const ok = pct !== null && pct > 2 && pct < 65;
  const band = ok ? c.bodyFatBand(sex, pct) : null;
  const mass = (v: number) => (
    <>
      <LiveNumber value={units === "metric" ? v : c.kgToLb(v)} decimals={units === "metric" ? 1 : 0} snapKey={units} /> {units === "metric" ? "kg" : "lb"}
    </>
  );

  return (
    <Layout
      inputs={
        <>
          <Segmented label="Sex (for the equation)" value={sex} onChange={setSex} options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }]} />
          <HeightInput key={`h-${units}`} cm={height} onChange={setHeight} units={units} />
          <LengthInput key={`n-${units}`} cm={neck} onChange={setNeck} units={units} label="Neck" hint="Just below the Adam's apple, tape sloping slightly down at the front." />
          {/* The hips field belongs to the waist field's block, so its gap opens and closes with it. */}
          <div>
            <LengthInput key={`wa-${units}`} cm={waist} onChange={setWaist} units={units} label="Waist" hint={sex === "male" ? "At the navel." : "At the narrowest point."} />
            <OptionalField show={sex === "female"} className={FIELD_BLEED}>
              <div className="px-1.5 pt-5">
                <LengthInput key={`hi-${units}`} cm={hip} onChange={setHip} units={units} label="Hips" hint="At the widest point." />
              </div>
            </OptionalField>
          </div>
          <WeightInput key={`w-${units}`} kg={kg} onChange={setKg} units={units} label="Weight (optional)" hint="Adds fat mass and lean mass to the result." />
        </>
      }
      result={
        ok && band ? (
          <Result tone={band.tone} label="Estimated body fat" value={<LiveNumber value={pct} decimals={1} />} unit="%" verdict={band.label}>
            {kg !== null && kg > 20 && (
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Fat mass" value={mass((kg * pct) / 100)} />
                <Stat label="Lean mass" value={mass(kg * (1 - pct / 100))} />
              </div>
            )}
            <p>Tape-measure estimates can be 3 to 4 points off. They are best for tracking change, so measure the same way each time.</p>
          </Result>
        ) : ready ? (
          <EmptyResult>Those measurements do not produce a sensible result. Please check them.</EmptyResult>
        ) : (
          <EmptyResult>Enter your measurements to estimate body fat.</EmptyResult>
        )
      }
    />
  );
}

/* ================================================================== Waist-to-height */
function WaistToHeightCalculator() {
  const [units] = useUnits();
  const [waist, setWaist] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const valid = waist !== null && height !== null && waist >= 40 && waist <= 250 && height >= 90 && height <= 250;
  const ratio = valid ? waist / height : null;
  const band = ratio !== null ? c.waistToHeightBand(ratio) : null;
  const len = (cm: number) => (units === "metric" ? `${fmt(cm, 0)} cm` : `${fmt(cm / c.CM_PER_IN, 1)} in`);

  return (
    <Layout
      inputs={
        <>
          <LengthInput key={`wa-${units}`} cm={waist} onChange={setWaist} units={units} label="Waist" hint="Midway between your lowest rib and the top of your hip bone, after breathing out." />
          <HeightInput key={`h-${units}`} cm={height} onChange={setHeight} units={units} />
        </>
      }
      result={
        ratio !== null && band && height !== null ? (
          <Result tone={band.tone} label="Waist-to-height ratio" value={<LiveNumber value={ratio} decimals={2} />} verdict={band.label}>
            <ScaleBar
              min={0.3}
              max={0.75}
              value={ratio}
              bands={[
                { label: "Low", from: 0.3, to: 0.4, tone: "low" },
                { label: "Healthy", from: 0.4, to: 0.5, tone: "good" },
                { label: "Increased", from: 0.5, to: 0.6, tone: "watch" },
                { label: "High", from: 0.6, to: 0.75, tone: "high" },
              ]}
            />
            <p>{band.detail}</p>
            <p>
              For your height, a waist under <strong>{len(height / 2)}</strong> keeps you below 0.5.
            </p>
          </Result>
        ) : (
          <EmptyResult>Enter your waist and height.</EmptyResult>
        )
      }
    />
  );
}

/* ================================================================== Sleep cycles */
function SleepCalculator() {
  const [mode, setMode] = useState<"wake" | "bed">("wake");
  const [time, setTime] = useState("07:00");
  const id = useId();
  const list = mode === "wake" ? c.bedtimesForWake(time) : c.wakeTimesForBed(time);

  return (
    <Layout
      units={false}
      inputs={
        <>
          <Segmented label="I want to" value={mode} onChange={setMode} options={[{ value: "wake", label: "Wake up at" }, { value: "bed", label: "Go to bed at" }]} />
          <Field label={mode === "wake" ? "Wake-up time" : "Bedtime"} htmlFor={id}>
            <input id={id} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input h-12 text-lg font-medium tabular-nums" />
          </Field>
        </>
      }
      result={
        list.length ? (
          <Result tone="low" label={mode === "wake" ? "Head to bed around" : "Set your alarm for"} value={c.formatClock(list[mode === "wake" ? 1 : 1].minutes)}>
            <ul className="space-y-2">
              {list.map((item) => (
                <li key={item.cycles} className={cn("flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3", item.hours >= 7.5 && "ring-[1.5px] ring-ink")}>
                  <span className="text-xl font-semibold tabular-nums text-ink">{c.formatClock(item.minutes)}</span>
                  <span className="text-right text-sm">
                    <span className="block font-semibold">{item.hours} hours of sleep</span>
                    <span className="block opacity-75">{item.cycles} cycles{item.hours < 7 ? " · short for most adults" : ""}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p>Includes about 15 minutes to fall asleep. Cycles vary from person to person, so use these as a nudge.</p>
          </Result>
        ) : (
          <EmptyResult>Pick a time to see your options.</EmptyResult>
        )
      }
    />
  );
}

/* ================================================================== Due date */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const longDate = (d: Date) => `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const shortDate = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;

function DueDateCalculator() {
  const [method, setMethod] = useState<"lmp" | "conception" | "ivf">("lmp");
  const [date, setDate] = useState("");
  const [cycle, setCycle] = useState("28");
  const [embryo, setEmbryo] = useState<"5" | "3">("5");
  // "Today" is only known in the browser, so it is empty until the page has hydrated.
  const todayKey = useToday();
  const today = useMemo(() => (todayKey ? c.parseIsoDate(todayKey) : null), [todayKey]);
  const d = c.parseIsoDate(date);
  const cyc = parseNum(cycle);
  const cycleOk = method !== "lmp" || (cyc !== null && cyc >= 21 && cyc <= 45);
  const result = useMemo(
    () => (d && cycleOk ? c.dueDate({ method, date: d, cycleLength: cyc ?? 28, embryoDay: embryo === "3" ? 3 : 5 }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [date, method, cycle, embryo],
  );
  const ga = result && today ? c.gestationalAge(result.start, today) : null;
  const inRange = ga ? ga.days >= 0 && ga.days <= 300 : true;
  const dateId = useId();
  const cycleId = useId();
  const labels = { lmp: "First day of your last period", conception: "Conception date", ivf: "Embryo transfer date" };

  return (
    <Layout
      units={false}
      inputs={
        <>
          <Segmented
            label="Work it out from"
            value={method}
            onChange={setMethod}
            options={[
              { value: "lmp", label: "Last period" },
              { value: "conception", label: "Conception" },
              { value: "ivf", label: "IVF transfer" },
            ]}
          />
          {/* The extra field of a method belongs to the date field's block, so its gap opens and closes with it. */}
          <div>
            <Field label={labels[method]} htmlFor={dateId}>
              <input id={dateId} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input h-12 text-lg font-medium" />
            </Field>
            <OptionalField show={method === "lmp"} className={FIELD_BLEED}>
              <div className="px-1.5 pt-5">
                <Field label="Usual cycle length" htmlFor={cycleId} hint="Count from the first day of one period to the first day of the next.">
                  <NumberInput id={cycleId} value={cycle} onChange={setCycle} suffix="days" min={21} max={45} step={1} />
                </Field>
              </div>
            </OptionalField>
            <OptionalField show={method === "ivf"} className={FIELD_BLEED}>
              <div className="px-1.5 pt-5">
                <Segmented label="Embryo age at transfer" value={embryo} onChange={setEmbryo} options={[{ value: "5", label: "Day 5" }, { value: "3", label: "Day 3" }]} />
              </div>
            </OptionalField>
          </div>
        </>
      }
      result={
        result && inRange ? (
          <Result tone="urgent" label="Estimated due date" value={<span className="text-[clamp(1.75rem,5vw,2.75rem)]">{longDate(result.due)}</span>}>
            {ga && ga.days >= 0 && (
              <p className="rounded-2xl bg-paper px-4 py-3 text-ink">
                Today you would be <strong>{ga.weeks} weeks{ga.extraDays ? ` and ${ga.extraDays} day${ga.extraDays > 1 ? "s" : ""}` : ""}</strong> pregnant.
              </p>
            )}
            <dl className="grid grid-cols-2 gap-2">
              <Stat label="Second trimester from" value={<span className="text-lg">{shortDate(result.secondTrimester)}</span>} sub="week 14" />
              <Stat label="Third trimester from" value={<span className="text-lg">{shortDate(result.thirdTrimester)}</span>} sub="week 28" />
            </dl>
            <p>Only a small share of babies arrive on their due date. An early ultrasound gives a more accurate date than calendar maths.</p>
          </Result>
        ) : result ? (
          <EmptyResult>That date gives a due date outside a current pregnancy. Please check it.</EmptyResult>
        ) : (
          <EmptyResult>Choose a date to estimate the due date.</EmptyResult>
        )
      }
    />
  );
}

/* ================================================================== Blood pressure */
function BloodPressureCalculator() {
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const s = parseNum(sys);
  const d = parseNum(dia);
  const valid = s !== null && d !== null && s >= 60 && s <= 280 && d >= 30 && d <= 180 && s > d;
  const band = valid ? c.bloodPressureBand(s, d) : null;
  const sid = useId();
  const did = useId();
  const rows = [
    { key: "normal", label: "Normal", sys: "Below 120", join: "and", dia: "Below 80" },
    { key: "elevated", label: "Elevated", sys: "120–129", join: "and", dia: "Below 80" },
    { key: "stage1", label: "Stage 1", sys: "130–139", join: "or", dia: "80–89" },
    { key: "stage2", label: "Stage 2", sys: "140 or higher", join: "or", dia: "90 or higher" },
    { key: "severe", label: "Severe", sys: "Above 180", join: "or", dia: "Above 120" },
  ];

  return (
    <Layout
      units={false}
      inputs={
        <>
          <Field label="Systolic (top number)" htmlFor={sid}>
            <NumberInput id={sid} value={sys} onChange={setSys} suffix="mm Hg" min={60} max={280} step={1} />
          </Field>
          <Field label="Diastolic (bottom number)" htmlFor={did}>
            <NumberInput id={did} value={dia} onChange={setDia} suffix="mm Hg" min={30} max={180} step={1} />
          </Field>
          <table className="w-full overflow-hidden rounded-2xl border-[1.5px] border-line-strong text-left text-sm">
            <caption className="sr-only">Blood pressure categories</caption>
            <thead className="bg-sand text-xs">
              <tr>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">Systolic</th>
                <th className="px-1 py-2" />
                <th className="px-3 py-2 font-semibold">Diastolic</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className={cn("border-t border-line transition-colors duration-(--dur-base)", band?.key === r.key && "bg-tone-soft font-semibold")}>
                  <th scope="row" className="px-3 py-2 font-semibold">{r.label}</th>
                  <td className="px-3 py-2 tabular-nums">{r.sys}</td>
                  <td className="px-1 py-2 text-xs text-ink-3">{r.join}</td>
                  <td className="px-3 py-2 tabular-nums">{r.dia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      }
      result={
        band && s !== null && d !== null ? (
          <Result tone={band.tone} label="This reading is" value={`${s}/${d}`} unit="mm Hg" verdict={band.label}>
            <p>{band.advice}</p>
            <p>One reading is a snapshot. Sit quietly for five minutes, take two readings a minute apart and look at the average over several days.</p>
          </Result>
        ) : (
          <EmptyResult>Enter both numbers from your reading.</EmptyResult>
        )
      }
    />
  );
}

/* ================================================================== Calories burned */
function CaloriesBurnedCalculator() {
  const [units] = useUnits();
  const [activity, setActivity] = useState<string>("walk-brisk");
  const [kg, setKg] = useState<number | null>(null);
  const [minutes, setMinutes] = useState("30");
  const m = parseNum(minutes);
  const act = c.ACTIVITIES.find((a) => a.key === activity) ?? c.ACTIVITIES[0];
  const valid = kg !== null && kg >= 20 && kg <= 400 && m !== null && m > 0 && m <= 1440;
  const kcal = valid ? c.caloriesBurned(act.met, kg, m) : null;
  const groups = useMemo(() => Array.from(new Set(c.ACTIVITIES.map((a) => a.group))), []);
  const aid = useId();
  const mid = useId();

  return (
    <Layout
      inputs={
        <>
          <Field label="Activity" htmlFor={aid}>
            <select id={aid} className="select h-12 text-base font-medium" value={activity} onChange={(e) => setActivity(e.target.value)}>
              {groups.map((g) => (
                <optgroup key={g} label={g}>
                  {c.ACTIVITIES.filter((a) => a.group === g).map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <WeightInput key={`w-${units}`} kg={kg} onChange={setKg} units={units} label="Body weight" />
          <Field label="Duration" htmlFor={mid}>
            <NumberInput id={mid} value={minutes} onChange={setMinutes} suffix="min" min={1} max={1440} step={5} />
          </Field>
        </>
      }
      result={
        kcal !== null && m !== null ? (
          <Result tone="high" label="Energy used" value={<LiveNumber value={kcal} />} unit="kcal">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Intensity" value={`${act.met} METs`} sub={act.met < 3 ? "light" : act.met < 6 ? "moderate" : "vigorous"} />
              <Stat
                label="Per hour"
                value={
                  <>
                    <LiveNumber value={(kcal / m) * 60} /> kcal
                  </>
                }
              />
            </div>
            <p>This includes the calories you would have burned at rest anyway. Individual results commonly differ by 10 to 20%.</p>
          </Result>
        ) : (
          <EmptyResult>Enter your weight to estimate calories burned.</EmptyResult>
        )
      }
    />
  );
}

/* ================================================================== Pace */
function PaceCalculator() {
  const [dist, setDist] = useState<string>("5k");
  const [custom, setCustom] = useState("");
  const [customUnit, setCustomUnit] = useState<"km" | "mi">("km");
  const [h, setH] = useState("0");
  const [m, setM] = useState("30");
  const [s, setS] = useState("0");
  const preset = c.RACE_DISTANCES.find((d) => d.key === dist);
  const customKm = parseNum(custom);
  const km = preset ? preset.km : customKm !== null ? (customUnit === "km" ? customKm : customKm * c.KM_PER_MILE) : null;
  const seconds = (parseNum(h) ?? 0) * 3600 + (parseNum(m) ?? 0) * 60 + (parseNum(s) ?? 0);
  const valid = km !== null && km > 0 && km <= 500 && seconds > 0;
  const pace = valid ? c.paceFrom(km, seconds) : null;
  const did = useId();
  const cid = useId();

  return (
    <Layout
      units={false}
      inputs={
        <>
          <Field label="Distance" htmlFor={did}>
            <select id={did} className="select h-12 text-base font-medium" value={dist} onChange={(e) => setDist(e.target.value)}>
              {c.RACE_DISTANCES.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
              <option value="custom">Custom distance</option>
            </select>
          </Field>
          {/* The custom distance row sits above the finish time in one block, so its gap opens and closes with it. */}
          <div>
            <OptionalField show={dist === "custom"} className={FIELD_BLEED}>
              <div className="grid grid-cols-[1fr_auto] items-end gap-2 px-1.5 pb-5">
                <Field label="Custom distance" htmlFor={cid}>
                  <NumberInput id={cid} value={custom} onChange={setCustom} suffix={customUnit} min={0} />
                </Field>
                <Segmented label="Unit" value={customUnit} onChange={setCustomUnit} options={[{ value: "km", label: "km" }, { value: "mi", label: "mi" }]} />
              </div>
            </OptionalField>
            <fieldset>
              <legend className="field-label">Finish time</legend>
              <div className="grid grid-cols-3 gap-2">
                <NumberInput value={h} onChange={setH} suffix="h" min={0} max={99} step={1} ariaLabel="Hours" />
                <NumberInput value={m} onChange={setM} suffix="min" min={0} max={59} step={1} ariaLabel="Minutes" />
                <NumberInput value={s} onChange={setS} suffix="s" min={0} max={59} step={1} ariaLabel="Seconds" />
              </div>
            </fieldset>
          </div>
        </>
      }
      result={
        pace && km !== null ? (
          <Result tone="watch" label="Your pace" value={<LiveNumber value={pace.perKm} format={c.formatDuration} />} unit="per km">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Per mile" value={<LiveNumber value={pace.perMile} format={c.formatDuration} />} />
              <Stat
                label="Speed"
                value={
                  <>
                    <LiveNumber value={pace.kmh} decimals={1} /> km/h
                  </>
                }
                sub={`${fmt(pace.mph, 1)} mph`}
              />
            </div>
            <table className="w-full text-left text-[0.9375rem]">
              <caption className="pb-1 text-left text-xs font-semibold uppercase tracking-wide opacity-70">Predicted times at other distances</caption>
              <tbody>
                {c.RACE_DISTANCES.filter((d) => Math.abs(d.km - km) > 0.01).map((d) => (
                  <tr key={d.key} className="border-b border-ink/10 last:border-0">
                    <th scope="row" className="py-1.5 font-medium">{d.label}</th>
                    <td className="py-1.5 text-right font-semibold tabular-nums">
                      <LiveNumber value={c.riegel(seconds, km, d.km)} format={c.formatDuration} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Predictions assume you have trained for the distance. Longer races are usually slower than the maths suggests.</p>
          </Result>
        ) : (
          <EmptyResult>Enter a distance and your time.</EmptyResult>
        )
      }
    />
  );
}

export const CALCULATORS: Record<string, () => ReactNode> = {
  bmi: BmiCalculator,
  tdee: TdeeCalculator,
  macros: MacroCalculator,
  protein: ProteinCalculator,
  water: WaterCalculator,
  "heart-rate-zones": HeartRateCalculator,
  "one-rep-max": OneRepMaxCalculator,
  "body-fat": BodyFatCalculator,
  "waist-to-height": WaistToHeightCalculator,
  "sleep-cycles": SleepCalculator,
  "due-date": DueDateCalculator,
  "blood-pressure": BloodPressureCalculator,
  "calories-burned": CaloriesBurnedCalculator,
  pace: PaceCalculator,
};

/** Renders the calculator for a tool slug. */
export function Calculator({ slug }: { slug: string }) {
  const Component = CALCULATORS[slug];
  return Component ? <Component /> : null;
}
