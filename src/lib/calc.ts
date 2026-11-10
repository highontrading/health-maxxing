/**
 * Calculator maths. Pure functions with no I/O, covered by scripts/test-calc.ts.
 * Formula sources are listed with each tool in lib/tools.ts.
 */

export type Sex = "male" | "female";
export type Tone = "good" | "watch" | "high" | "low" | "urgent";

/* ---------------- Units ---------------- */
export const LB_PER_KG = 2.2046226218;
export const CM_PER_IN = 2.54;
export const KM_PER_MILE = 1.609344;
export const kgToLb = (kg: number) => kg * LB_PER_KG;
export const lbToKg = (lb: number) => lb / LB_PER_KG;
export const cmToIn = (cm: number) => cm / CM_PER_IN;
export const inToCm = (inch: number) => inch * CM_PER_IN;
export const ftInToCm = (ft: number, inch: number) => (ft * 12 + inch) * CM_PER_IN;
export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const total = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(total / 12), inch: total % 12 };
}
export const round = (v: number, dp = 0) => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};

/* ---------------- BMI ---------------- */
export function bmi(kg: number, cm: number): number {
  const m = cm / 100;
  return kg / (m * m);
}
export type BmiBand = { key: string; label: string; tone: Tone; min: number; max: number };
export const BMI_BANDS: BmiBand[] = [
  { key: "under", label: "Underweight", tone: "low", min: 0, max: 18.5 },
  { key: "healthy", label: "Healthy weight", tone: "good", min: 18.5, max: 25 },
  { key: "over", label: "Overweight", tone: "watch", min: 25, max: 30 },
  { key: "ob1", label: "Obesity (class 1)", tone: "high", min: 30, max: 35 },
  { key: "ob2", label: "Obesity (class 2)", tone: "high", min: 35, max: 40 },
  { key: "ob3", label: "Obesity (class 3)", tone: "high", min: 40, max: Infinity },
];
export function bmiBand(value: number): BmiBand {
  return BMI_BANDS.find((b) => value >= b.min && value < b.max) ?? BMI_BANDS[BMI_BANDS.length - 1];
}
/** Weight range (kg) for a BMI of 18.5 to 24.9 at this height. */
export function healthyWeightRange(cm: number): [number, number] {
  const m2 = (cm / 100) ** 2;
  return [18.5 * m2, 24.9 * m2];
}

/* ---------------- Energy ---------------- */
export function bmrMifflin(sex: Sex, kg: number, cm: number, age: number): number {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === "male" ? 5 : -161);
}
export const ACTIVITY_LEVELS = [
  { key: "sedentary", factor: 1.2, label: "Sedentary", detail: "Desk job, little deliberate exercise" },
  { key: "light", factor: 1.375, label: "Lightly active", detail: "Light exercise 1 to 3 days a week" },
  { key: "moderate", factor: 1.55, label: "Moderately active", detail: "Moderate exercise 3 to 5 days a week" },
  { key: "very", factor: 1.725, label: "Very active", detail: "Hard exercise 6 to 7 days a week" },
  { key: "extra", factor: 1.9, label: "Extremely active", detail: "Physical job plus daily training" },
] as const;
export function tdee(bmr: number, activityKey: string): number {
  const level = ACTIVITY_LEVELS.find((a) => a.key === activityKey) ?? ACTIVITY_LEVELS[0];
  return bmr * level.factor;
}

/* ---------------- Macros ---------------- */
export const MACRO_STYLES = [
  { key: "balanced", label: "Balanced", detail: "Moderate protein, plenty of carbs", proteinPerKg: 1.2, fatShare: 0.3, carbShare: null },
  { key: "high-protein", label: "Higher protein", detail: "For training or fat loss", proteinPerKg: 1.8, fatShare: 0.3, carbShare: null },
  { key: "endurance", label: "Endurance", detail: "More carbohydrate for long sessions", proteinPerKg: 1.4, fatShare: 0.25, carbShare: null },
  { key: "lower-carb", label: "Lower carb", detail: "Fewer carbs, more fat", proteinPerKg: 1.8, fatShare: null, carbShare: 0.25 },
] as const;
export type MacroResult = {
  protein: number;
  carbs: number;
  fat: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
};
export function macroSplit(kcal: number, kg: number, styleKey: string): MacroResult {
  const style = MACRO_STYLES.find((s) => s.key === styleKey) ?? MACRO_STYLES[0];
  // Keep protein inside the 10 to 35% acceptable range.
  let proteinKcal = Math.min(Math.max(style.proteinPerKg * kg * 4, kcal * 0.1), kcal * 0.35);
  let fatKcal: number;
  let carbKcal: number;
  if (style.carbShare !== null) {
    carbKcal = kcal * style.carbShare;
    fatKcal = kcal - proteinKcal - carbKcal;
  } else {
    fatKcal = kcal * (style.fatShare ?? 0.3);
    carbKcal = kcal - proteinKcal - fatKcal;
  }
  if (carbKcal < 0) {
    proteinKcal += carbKcal;
    carbKcal = 0;
  }
  return {
    protein: proteinKcal / 4,
    carbs: carbKcal / 4,
    fat: fatKcal / 9,
    proteinPct: (proteinKcal / kcal) * 100,
    carbsPct: (carbKcal / kcal) * 100,
    fatPct: (fatKcal / kcal) * 100,
  };
}

/* ---------------- Protein ---------------- */
export const PROTEIN_GOALS = [
  { key: "general", label: "General health", detail: "Mostly sedentary adult", min: 0.8, max: 1.0 },
  { key: "active", label: "Regularly active", detail: "Exercise most weeks", min: 1.2, max: 1.6 },
  { key: "muscle", label: "Building muscle", detail: "Consistent resistance training", min: 1.6, max: 2.2 },
  { key: "fat-loss", label: "Losing fat, keeping muscle", detail: "Calorie deficit with training", min: 1.6, max: 2.2 },
  { key: "older", label: "Over 65", detail: "Preserving muscle with age", min: 1.0, max: 1.2 },
] as const;
export function proteinRange(kg: number, goalKey: string) {
  const goal = PROTEIN_GOALS.find((g) => g.key === goalKey) ?? PROTEIN_GOALS[0];
  return {
    min: goal.min * kg,
    max: goal.max * kg,
    perMealMin: 0.25 * kg,
    perMealMax: 0.4 * kg,
    goal,
  };
}

/* ---------------- Water ---------------- */
export function waterRange(kg: number, exerciseMinutes: number, hot: boolean): { min: number; max: number } {
  const exerciseHours = Math.max(0, exerciseMinutes) / 60;
  const min = (kg * 30) / 1000 + exerciseHours * 0.4 + (hot ? 0.3 : 0);
  const max = (kg * 35) / 1000 + exerciseHours * 0.8 + (hot ? 0.7 : 0);
  return { min, max };
}

/* ---------------- Heart rate ---------------- */
export const maxHeartRate = (age: number) => 208 - 0.7 * age;
export const HR_ZONES = [
  { zone: 1, label: "Recovery", feel: "Very easy. Full sentences, could go for hours.", lo: 0.5, hi: 0.6, color: "sky" },
  { zone: 2, label: "Endurance", feel: "Easy. You can hold a conversation.", lo: 0.6, hi: 0.7, color: "green" },
  { zone: 3, label: "Tempo", feel: "Comfortably hard. Short sentences.", lo: 0.7, hi: 0.8, color: "yellow" },
  { zone: 4, label: "Threshold", feel: "Hard. A few words at a time.", lo: 0.8, hi: 0.9, color: "orange" },
  { zone: 5, label: "Maximum", feel: "All out. No talking.", lo: 0.9, hi: 1.0, color: "pink" },
] as const;
export function heartRateZones(age: number, resting?: number) {
  const max = maxHeartRate(age);
  const useReserve = typeof resting === "number" && resting > 25 && resting < max - 20;
  return {
    max,
    method: useReserve ? ("reserve" as const) : ("max" as const),
    zones: HR_ZONES.map((z) => ({
      ...z,
      from: Math.round(useReserve ? resting! + z.lo * (max - resting!) : z.lo * max),
      to: Math.round(useReserve ? resting! + z.hi * (max - resting!) : z.hi * max),
    })),
  };
}

/* ---------------- Strength ---------------- */
export function oneRepMax(weight: number, reps: number) {
  if (reps <= 1) return { epley: weight, brzycki: weight, average: weight };
  const epley = weight * (1 + reps / 30);
  const brzycki = reps < 37 ? (weight * 36) / (37 - reps) : epley;
  return { epley, brzycki, average: (epley + brzycki) / 2 };
}
export const LOAD_CHART = [
  { pct: 95, reps: "2" },
  { pct: 90, reps: "3 to 4" },
  { pct: 85, reps: "5 to 6" },
  { pct: 80, reps: "7 to 8" },
  { pct: 75, reps: "9 to 10" },
  { pct: 70, reps: "11 to 12" },
  { pct: 65, reps: "13 to 15" },
  { pct: 60, reps: "16 to 18" },
];

/* ---------------- Body fat (US Navy) ---------------- */
export function navyBodyFat(p: { sex: Sex; heightCm: number; neckCm: number; waistCm: number; hipCm?: number }): number | null {
  const log10 = Math.log10;
  if (p.sex === "male") {
    const girth = p.waistCm - p.neckCm;
    if (girth <= 0) return null;
    return 495 / (1.0324 - 0.19077 * log10(girth) + 0.15456 * log10(p.heightCm)) - 450;
  }
  const girth = p.waistCm + (p.hipCm ?? 0) - p.neckCm;
  if (girth <= 0 || !p.hipCm) return null;
  return 495 / (1.29579 - 0.35004 * log10(girth) + 0.221 * log10(p.heightCm)) - 450;
}
export function bodyFatBand(sex: Sex, pct: number): { label: string; tone: Tone } {
  const bands =
    sex === "male"
      ? [
          { max: 6, label: "Essential fat", tone: "low" as Tone },
          { max: 14, label: "Athletic", tone: "good" as Tone },
          { max: 18, label: "Fit", tone: "good" as Tone },
          { max: 25, label: "Average", tone: "watch" as Tone },
          { max: Infinity, label: "Above average", tone: "high" as Tone },
        ]
      : [
          { max: 14, label: "Essential fat", tone: "low" as Tone },
          { max: 21, label: "Athletic", tone: "good" as Tone },
          { max: 25, label: "Fit", tone: "good" as Tone },
          { max: 32, label: "Average", tone: "watch" as Tone },
          { max: Infinity, label: "Above average", tone: "high" as Tone },
        ];
  return bands.find((b) => pct < b.max) ?? bands[bands.length - 1];
}

/* ---------------- Waist-to-height ---------------- */
export function waistToHeightBand(ratio: number): { label: string; tone: Tone; detail: string } {
  if (ratio < 0.4) return { label: "Below the healthy range", tone: "low", detail: "A ratio under 0.4 can go with being underweight." };
  if (ratio < 0.5) return { label: "Healthy", tone: "good", detail: "Your waist is less than half your height." };
  if (ratio < 0.6) return { label: "Increased risk", tone: "watch", detail: "Central fat is raising your health risk." };
  return { label: "High risk", tone: "high", detail: "Central fat is substantially raising your health risk." };
}

/* ---------------- Sleep ---------------- */
const CYCLE_MIN = 90;
const FALL_ASLEEP_MIN = 15;
function parseTime(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}
export function formatClock(totalMinutes: number, twelveHour = true): string {
  const t = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(t / 60);
  const m = t % 60;
  const mm = String(m).padStart(2, "0");
  if (!twelveHour) return `${String(h).padStart(2, "0")}:${mm}`;
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${period}`;
}
export function bedtimesForWake(wake: string) {
  const w = parseTime(wake);
  if (w === null) return [];
  return [6, 5, 4].map((cycles) => ({
    cycles,
    hours: (cycles * CYCLE_MIN) / 60,
    minutes: w - cycles * CYCLE_MIN - FALL_ASLEEP_MIN,
  }));
}
export function wakeTimesForBed(bed: string) {
  const b = parseTime(bed);
  if (b === null) return [];
  return [4, 5, 6].map((cycles) => ({
    cycles,
    hours: (cycles * CYCLE_MIN) / 60,
    minutes: b + FALL_ASLEEP_MIN + cycles * CYCLE_MIN,
  }));
}

/* ---------------- Pregnancy ---------------- */
const DAY = 86_400_000;
export function parseIsoDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) || d.getUTCDate() !== Number(m[3]) ? null : d;
}
export const addDays = (d: Date, days: number) => new Date(d.getTime() + days * DAY);
export function dueDate(p: { method: "lmp" | "conception" | "ivf"; date: Date; cycleLength?: number; embryoDay?: 3 | 5 }) {
  let due: Date;
  if (p.method === "lmp") due = addDays(p.date, 280 + ((p.cycleLength ?? 28) - 28));
  else if (p.method === "conception") due = addDays(p.date, 266);
  else due = addDays(p.date, 266 - (p.embryoDay ?? 5));
  const start = addDays(due, -280); // equivalent first day of a 40-week pregnancy
  return {
    due,
    start,
    secondTrimester: addDays(start, 14 * 7),
    thirdTrimester: addDays(start, 28 * 7),
    fullTerm: addDays(start, 39 * 7),
  };
}
export function gestationalAge(start: Date, today: Date) {
  const days = Math.floor((today.getTime() - start.getTime()) / DAY);
  return { days, weeks: Math.floor(days / 7), extraDays: ((days % 7) + 7) % 7 };
}

/* ---------------- Blood pressure ---------------- */
export type BpBand = { key: string; label: string; tone: Tone; advice: string };
export function bloodPressureBand(sys: number, dia: number): BpBand {
  if (sys > 180 || dia > 120) {
    return {
      key: "severe",
      label: "Severely high",
      tone: "urgent",
      advice:
        "Rest for five minutes and measure again. If it is still this high, contact a doctor promptly. If you also have chest pain, shortness of breath, back pain, weakness, vision changes or trouble speaking, call your local emergency number now.",
    };
  }
  if (sys >= 140 || dia >= 90) {
    return {
      key: "stage2",
      label: "High (stage 2 hypertension)",
      tone: "high",
      advice:
        "Readings at this level on several days need a medical appointment. Guidelines usually recommend medication together with lifestyle changes.",
    };
  }
  if (sys >= 130 || dia >= 80) {
    return {
      key: "stage1",
      label: "High (stage 1 hypertension)",
      tone: "high",
      advice:
        "If your readings stay here, see a doctor. Treatment depends on your overall cardiovascular risk and often starts with lifestyle changes.",
    };
  }
  if (sys >= 120) {
    return {
      key: "elevated",
      label: "Elevated",
      tone: "watch",
      advice: "Not yet hypertension, but it tends to climb. Less salt, more activity and limiting alcohol can bring it down.",
    };
  }
  if (sys < 90 || dia < 60) {
    return {
      key: "low",
      label: "Low",
      tone: "low",
      advice:
        "Low readings are often harmless if you feel well. See a doctor if you feel dizzy, faint, unusually tired or confused.",
    };
  }
  return { key: "normal", label: "Normal", tone: "good", advice: "Keep doing what you are doing, and recheck from time to time." };
}

/* ---------------- Calories burned ---------------- */
export const ACTIVITIES = [
  { key: "walk-slow", group: "Walking", label: "Walking, slow (4 km/h)", met: 3.0 },
  { key: "walk-moderate", group: "Walking", label: "Walking, moderate (4.8 km/h)", met: 3.5 },
  { key: "walk-brisk", group: "Walking", label: "Walking, brisk (5.6 km/h)", met: 4.3 },
  { key: "walk-fast", group: "Walking", label: "Walking, very brisk (6.4 km/h)", met: 5.0 },
  { key: "hike", group: "Walking", label: "Hiking", met: 6.0 },
  { key: "stairs-slow", group: "Walking", label: "Climbing stairs, slow", met: 4.0 },
  { key: "stairs-fast", group: "Walking", label: "Climbing stairs, fast", met: 8.8 },
  { key: "run-8", group: "Running", label: "Running, 8 km/h (7:30 per km)", met: 8.3 },
  { key: "run-10", group: "Running", label: "Running, 9.7 km/h (6:12 per km)", met: 9.8 },
  { key: "run-11", group: "Running", label: "Running, 11.3 km/h (5:19 per km)", met: 11.0 },
  { key: "run-13", group: "Running", label: "Running, 12.9 km/h (4:39 per km)", met: 11.8 },
  { key: "rope", group: "Running", label: "Jump rope, moderate", met: 11.8 },
  { key: "bike-leisure", group: "Cycling", label: "Cycling, leisurely (under 16 km/h)", met: 4.0 },
  { key: "bike-light", group: "Cycling", label: "Cycling, light (16 to 19 km/h)", met: 6.8 },
  { key: "bike-moderate", group: "Cycling", label: "Cycling, moderate (19 to 22 km/h)", met: 8.0 },
  { key: "bike-vigorous", group: "Cycling", label: "Cycling, vigorous (22 to 26 km/h)", met: 10.0 },
  { key: "bike-stationary", group: "Cycling", label: "Stationary bike, moderate", met: 6.8 },
  { key: "swim-easy", group: "Water", label: "Swimming laps, easy to moderate", met: 5.8 },
  { key: "swim-hard", group: "Water", label: "Swimming laps, vigorous", met: 9.8 },
  { key: "row-moderate", group: "Gym", label: "Rowing machine, moderate", met: 4.8 },
  { key: "row-vigorous", group: "Gym", label: "Rowing machine, vigorous", met: 8.5 },
  { key: "elliptical", group: "Gym", label: "Elliptical trainer, moderate", met: 5.0 },
  { key: "weights-moderate", group: "Gym", label: "Weight training, moderate", met: 3.5 },
  { key: "weights-vigorous", group: "Gym", label: "Weight training, vigorous", met: 6.0 },
  { key: "circuit", group: "Gym", label: "Circuit training or HIIT, vigorous", met: 8.0 },
  { key: "aerobics", group: "Gym", label: "Aerobics class", met: 7.3 },
  { key: "yoga", group: "Mind and body", label: "Yoga, hatha", met: 2.5 },
  { key: "yoga-power", group: "Mind and body", label: "Yoga, power", met: 4.0 },
  { key: "pilates", group: "Mind and body", label: "Pilates", met: 3.0 },
  { key: "football", group: "Sport", label: "Football (soccer), casual", met: 7.0 },
  { key: "basketball", group: "Sport", label: "Basketball, game", met: 8.0 },
  { key: "tennis", group: "Sport", label: "Tennis, singles", met: 8.0 },
  { key: "badminton", group: "Sport", label: "Badminton, social", met: 5.5 },
  { key: "cricket", group: "Sport", label: "Cricket", met: 4.8 },
  { key: "golf", group: "Sport", label: "Golf, walking with clubs", met: 4.3 },
  { key: "martial", group: "Sport", label: "Martial arts", met: 10.3 },
  { key: "garden", group: "Everyday", label: "Gardening", met: 3.8 },
  { key: "clean", group: "Everyday", label: "House cleaning", met: 3.3 },
  { key: "kids", group: "Everyday", label: "Active play with children", met: 3.5 },
] as const;
/** kcal = MET x 3.5 x kg / 200 per minute. */
export function caloriesBurned(met: number, kg: number, minutes: number): number {
  return ((met * 3.5 * kg) / 200) * minutes;
}

/* ---------------- Pace ---------------- */
export const RACE_DISTANCES = [
  { key: "1k", label: "1 km", km: 1 },
  { key: "mile", label: "1 mile", km: KM_PER_MILE },
  { key: "5k", label: "5K", km: 5 },
  { key: "10k", label: "10K", km: 10 },
  { key: "half", label: "Half marathon", km: 21.0975 },
  { key: "marathon", label: "Marathon", km: 42.195 },
] as const;
export function paceFrom(distanceKm: number, seconds: number) {
  const perKm = seconds / distanceKm;
  return { perKm, perMile: perKm * KM_PER_MILE, kmh: distanceKm / (seconds / 3600), mph: distanceKm / KM_PER_MILE / (seconds / 3600) };
}
export const riegel = (seconds: number, fromKm: number, toKm: number) => seconds * (toKm / fromKm) ** 1.06;
export function formatDuration(totalSeconds: number): string {
  const sTotal = Math.round(totalSeconds);
  const h = Math.floor(sTotal / 3600);
  const m = Math.floor((sTotal % 3600) / 60);
  const sec = sTotal % 60;
  const pad = (v: number) => String(v).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
