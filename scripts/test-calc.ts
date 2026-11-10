/**
 * Checks the calculator maths against hand-worked examples.
 *   npx tsx scripts/test-calc.ts
 */
import assert from "node:assert/strict";
import * as c from "../src/lib/calc";

const near = (actual: number, expected: number, tol = 0.01, label = "") =>
  assert.ok(Math.abs(actual - expected) <= tol, `${label} expected ${expected}, got ${actual}`);

// BMI: 70 kg at 175 cm = 70 / 1.75^2 = 22.857
near(c.bmi(70, 175), 22.857, 0.001, "bmi");
assert.equal(c.bmiBand(22.86).key, "healthy");
assert.equal(c.bmiBand(18.49).key, "under");
assert.equal(c.bmiBand(25).key, "over");
assert.equal(c.bmiBand(30).key, "ob1");
assert.equal(c.bmiBand(41).key, "ob3");
const [lo, hi] = c.healthyWeightRange(175);
near(lo, 56.66, 0.01, "healthy lo");
near(hi, 76.26, 0.01, "healthy hi");

// Mifflin-St Jeor: man 30 y, 70 kg, 175 cm = 700 + 1093.75 - 150 + 5 = 1648.75
near(c.bmrMifflin("male", 70, 175, 30), 1648.75, 0.001, "bmr male");
// woman 30 y, 60 kg, 165 cm = 600 + 1031.25 - 150 - 161 = 1320.25
near(c.bmrMifflin("female", 60, 165, 30), 1320.25, 0.001, "bmr female");
near(c.tdee(1648.75, "moderate"), 2555.56, 0.01, "tdee");

// Macros: 2000 kcal, 70 kg, balanced: protein 84 g (336 kcal), fat 30% = 600 kcal = 66.7 g, carbs 1064 kcal = 266 g
const m = c.macroSplit(2000, 70, "balanced");
near(m.protein, 84, 0.01, "macro protein");
near(m.fat, 66.67, 0.01, "macro fat");
near(m.carbs, 266, 0.01, "macro carbs");
near(m.proteinPct + m.carbsPct + m.fatPct, 100, 0.001, "macro pct");
// Lower carb: protein 126 g (504), carbs 25% = 500 kcal = 125 g, fat = 996 kcal = 110.7 g
const lc = c.macroSplit(2000, 70, "lower-carb");
near(lc.carbs, 125, 0.01, "lc carbs");
near(lc.fat, 110.67, 0.01, "lc fat");
// Protein is capped at 35% of energy on small intakes
near(c.macroSplit(1200, 120, "high-protein").proteinPct, 35, 0.001, "protein cap");

// Protein: 70 kg building muscle = 112 to 154 g
const p = c.proteinRange(70, "muscle");
near(p.min, 112, 0.001, "protein min");
near(p.max, 154, 0.001, "protein max");

// Water: 70 kg, no exercise = 2.1 to 2.45 L
const w = c.waterRange(70, 0, false);
near(w.min, 2.1, 0.001, "water min");
near(w.max, 2.45, 0.001, "water max");
near(c.waterRange(70, 60, true).max, 2.45 + 0.8 + 0.7, 0.001, "water hot exercise");

// Heart rate: age 40 -> 208 - 28 = 180; zone 2 = 108 to 126
assert.equal(c.maxHeartRate(40), 180);
const z = c.heartRateZones(40);
assert.equal(z.method, "max");
assert.deepEqual([z.zones[1].from, z.zones[1].to], [108, 126]);
// Karvonen with resting 60: reserve 120; zone 2 = 60 + 72 = 132 to 60 + 84 = 144
const zr = c.heartRateZones(40, 60);
assert.equal(zr.method, "reserve");
assert.deepEqual([zr.zones[1].from, zr.zones[1].to], [132, 144]);

// One-rep max: 100 x 5 -> Epley 116.67, Brzycki 112.5
const orm = c.oneRepMax(100, 5);
near(orm.epley, 116.667, 0.001, "epley");
near(orm.brzycki, 112.5, 0.001, "brzycki");
assert.equal(c.oneRepMax(100, 1).average, 100);

// US Navy body fat. Man: height 178, neck 38, waist 86.
// 495 / (1.0324 - 0.19077*log10(48) + 0.15456*log10(178)) - 450
const male = c.navyBodyFat({ sex: "male", heightCm: 178, neckCm: 38, waistCm: 86 })!;
const expectMale = 495 / (1.0324 - 0.19077 * Math.log10(48) + 0.15456 * Math.log10(178)) - 450;
near(male, expectMale, 1e-9, "navy male");
assert.ok(male > 14 && male < 20, `navy male plausible (${male})`);
const female = c.navyBodyFat({ sex: "female", heightCm: 165, neckCm: 32, waistCm: 72, hipCm: 98 })!;
assert.ok(female > 22 && female < 32, `navy female plausible (${female})`);
assert.equal(c.navyBodyFat({ sex: "male", heightCm: 178, neckCm: 40, waistCm: 40 }), null);
assert.equal(c.bodyFatBand("male", 16).label, "Fit");
assert.equal(c.bodyFatBand("female", 28).label, "Average");

// Waist-to-height
assert.equal(c.waistToHeightBand(80 / 175).label, "Healthy");
assert.equal(c.waistToHeightBand(0.5).label, "Increased risk");
assert.equal(c.waistToHeightBand(0.6).label, "High risk");
assert.equal(c.waistToHeightBand(0.39).tone, "low");

// Sleep: wake 07:00 -> 6 cycles (9 h) + 15 min = 21:45, 5 cycles = 23:15, 4 cycles = 00:45
const beds = c.bedtimesForWake("07:00").map((b) => c.formatClock(b.minutes, false));
assert.deepEqual(beds, ["21:45", "23:15", "00:45"]);
const wakes = c.wakeTimesForBed("23:00").map((b) => c.formatClock(b.minutes, false));
assert.deepEqual(wakes, ["05:15", "06:45", "08:15"]);
assert.equal(c.formatClock(0), "12:00 am");
assert.equal(c.formatClock(13 * 60 + 5), "1:05 pm");
assert.deepEqual(c.bedtimesForWake("25:00"), []);

// Due date: LMP 1 Jan 2026 + 280 days = 8 Oct 2026
const lmp = c.parseIsoDate("2026-01-01")!;
const d = c.dueDate({ method: "lmp", date: lmp });
assert.equal(d.due.toISOString().slice(0, 10), "2026-10-08");
// 35-day cycle shifts it a week later
assert.equal(c.dueDate({ method: "lmp", date: lmp, cycleLength: 35 }).due.toISOString().slice(0, 10), "2026-10-15");
// Conception 15 Jan 2026 + 266 = 8 Oct 2026 (same pregnancy as LMP 1 Jan)
assert.equal(c.dueDate({ method: "conception", date: c.parseIsoDate("2026-01-15")! }).due.toISOString().slice(0, 10), "2026-10-08");
// Day-5 transfer on 20 Jan 2026 + 261 = 8 Oct 2026
assert.equal(c.dueDate({ method: "ivf", date: c.parseIsoDate("2026-01-20")!, embryoDay: 5 }).due.toISOString().slice(0, 10), "2026-10-08");
assert.equal(d.start.toISOString().slice(0, 10), "2026-01-01");
const ga = c.gestationalAge(d.start, c.parseIsoDate("2026-03-12")!);
assert.deepEqual([ga.weeks, ga.extraDays], [10, 0]);
assert.equal(c.parseIsoDate("2026-02-30"), null);

// Blood pressure categories (ACC/AHA)
assert.equal(c.bloodPressureBand(115, 75).key, "normal");
assert.equal(c.bloodPressureBand(125, 75).key, "elevated");
assert.equal(c.bloodPressureBand(125, 82).key, "stage1");
assert.equal(c.bloodPressureBand(135, 70).key, "stage1");
assert.equal(c.bloodPressureBand(142, 70).key, "stage2");
assert.equal(c.bloodPressureBand(118, 92).key, "stage2");
assert.equal(c.bloodPressureBand(185, 90).key, "severe");
assert.equal(c.bloodPressureBand(150, 125).key, "severe");
assert.equal(c.bloodPressureBand(85, 55).key, "low");
assert.equal(c.bloodPressureBand(180, 120).key, "stage2");

// Calories: 70 kg brisk walk (4.3 MET) for 30 min = 4.3*3.5*70/200*30 = 158.03
near(c.caloriesBurned(4.3, 70, 30), 158.025, 0.001, "calories");

// Pace: 10 km in 50:00 -> 5:00/km, 12 km/h; Riegel to half marathon
const pc = c.paceFrom(10, 3000);
near(pc.perKm, 300, 1e-9, "pace/km");
near(pc.kmh, 12, 1e-9, "kmh");
near(pc.perMile, 482.8, 0.01, "pace/mile");
near(c.riegel(3000, 10, 21.0975), 3000 * 2.10975 ** 1.06, 1e-6, "riegel");
assert.equal(c.formatDuration(3725), "1:02:05");
assert.equal(c.formatDuration(305), "5:05");

// Units
near(c.kgToLb(70), 154.32, 0.01, "kg->lb");
near(c.ftInToCm(5, 9), 175.26, 0.001, "ft/in->cm");
assert.deepEqual(c.cmToFtIn(175.26), { ft: 5, inch: 9 });

console.log("calc: all checks passed");
