/**
 * Calculator definitions. The maths lives in lib/calc.ts, the interface in
 * components/tools/. Slugs are referenced from articles, so do not rename them.
 */
import type { ColorKey } from "./types";

export type ToolSource = { title: string; publisher: string; url?: string; year?: number };

export type Tool = {
  slug: string;
  name: string;
  short: string;
  summary: string;
  sticker: string;
  color: ColorKey;
  category: string;
  keywords: string;
  /** Plain-language explanation shown under the calculator. Markdown. */
  about: string;
  sources: ToolSource[];
  related: string[];
};

const pubmed = (title: string) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(title).replace(/%20/g, "+")}`;

export const TOOLS: Tool[] = [
  {
    slug: "bmi",
    name: "BMI Calculator",
    short: "BMI",
    summary: "Body mass index from your height and weight, with the healthy weight range for your height.",
    sticker: "scale",
    color: "teal",
    category: "metabolism",
    keywords: "body mass index weight height overweight obesity underweight",
    about: `Body mass index is your weight in kilograms divided by your height in meters squared. The World Health Organization uses it to sort adults into four broad groups: underweight (below 18.5), healthy weight (18.5 to 24.9), overweight (25 to 29.9) and obesity (30 and above).

BMI is a screening number, not a diagnosis. It cannot tell muscle from fat or show where fat is carried, so it tends to overestimate risk in muscular people and underestimate it in older adults who have lost muscle. Health risks also begin at lower values in some groups: a WHO expert consultation suggested action points of 23 and 27.5 for many Asian populations.

Use it alongside your waist measurement, which says more about the fat that matters most for your heart and metabolism. It does not apply to children, teenagers or pregnancy, which use different charts.`,
    sources: [
      { title: "Obesity and overweight", publisher: "World Health Organization", url: "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight" },
      { title: "Appropriate body-mass index for Asian populations and its implications for policy and intervention strategies", publisher: "The Lancet", year: 2004, url: pubmed("Appropriate body-mass index for Asian populations and its implications for policy and intervention strategies") },
    ],
    related: ["bmi-waist-and-body-composition", "weight-loss-that-lasts"],
  },
  {
    slug: "tdee",
    name: "Calorie Needs (TDEE) Calculator",
    short: "Calorie needs",
    summary: "Estimate how many calories you burn in a day from your size, age and activity level.",
    sticker: "flame",
    color: "orange",
    category: "metabolism",
    keywords: "tdee bmr calories maintenance metabolism mifflin st jeor energy expenditure",
    about: `This calculator first estimates your basal metabolic rate (BMR), the energy your body uses at rest, with the Mifflin-St Jeor equation: 10 x weight (kg) + 6.25 x height (cm) - 5 x age, then plus 5 for men or minus 161 for women. It then multiplies BMR by an activity factor to estimate total daily energy expenditure (TDEE).

Treat the result as a starting point. Prediction equations are typically within about 10% for most people, and the activity factor is the weakest link, because people tend to overestimate how active they are. The reliable test is your own data: eat at the estimate for two to three weeks and see what your weight does.

A daily deficit of roughly 500 kcal is a common, moderate target for gradual weight loss. Very low intakes should only be followed with medical supervision.`,
    sources: [
      { title: "A new predictive equation for resting energy expenditure in healthy individuals", publisher: "The American Journal of Clinical Nutrition", year: 1990, url: pubmed("A new predictive equation for resting energy expenditure in healthy individuals") },
      { title: "Comparison of predictive equations for resting metabolic rate in healthy nonobese and obese adults: a systematic review", publisher: "Journal of the American Dietetic Association", year: 2005, url: pubmed("Comparison of predictive equations for resting metabolic rate in healthy nonobese and obese adults: a systematic review") },
    ],
    related: ["metabolism-101", "weight-loss-that-lasts"],
  },
  {
    slug: "macros",
    name: "Macro Calculator",
    short: "Macros",
    summary: "Split a daily calorie target into grams of protein, carbohydrate and fat.",
    sticker: "bowl",
    color: "lime",
    category: "nutrition",
    keywords: "macros macronutrients protein carbs fat split grams calories",
    about: `Macronutrients supply energy: protein and carbohydrate provide about 4 kcal per gram, fat about 9. This calculator sets protein from your body weight first, because protein needs track body size rather than calories, then divides the remaining calories between fat and carbohydrate according to the style you choose.

There is no single best split. The US National Academies give wide acceptable ranges for adults: 45 to 65% of energy from carbohydrate, 20 to 35% from fat and 10 to 35% from protein. Within those ranges, the best pattern is the one you can keep eating, built mostly from minimally processed foods.`,
    sources: [
      { title: "Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids", publisher: "National Academies of Sciences, Engineering, and Medicine", year: 2005 },
    ],
    related: ["how-much-protein-do-you-need", "carbs-explained", "dietary-fats-decoded"],
  },
  {
    slug: "protein",
    name: "Protein Calculator",
    short: "Protein",
    summary: "A daily protein range for your weight and goal, with a per-meal target.",
    sticker: "egg",
    color: "yellow",
    category: "nutrition",
    keywords: "protein intake grams per kg muscle rda daily",
    about: `The recommended dietary allowance for protein is 0.8 g per kilogram of body weight a day. That is the amount that prevents deficiency in nearly all healthy adults, not necessarily the best amount for every goal.

People who train regularly generally do better with more. A 2018 meta-analysis of resistance-training studies found that the benefit of extra protein for muscle gain leveled off at around 1.6 g/kg a day, and the International Society of Sports Nutrition suggests 1.4 to 2.0 g/kg for most exercising adults. Expert groups also recommend at least 1.0 to 1.2 g/kg for adults over 65 to help preserve muscle.

Spreading intake across meals, roughly 0.25 to 0.4 g/kg each, appears to support muscle building better than one large serving. People with kidney disease should follow their own clinician's advice on protein.`,
    sources: [
      { title: "A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults", publisher: "British Journal of Sports Medicine", year: 2018, url: pubmed("A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults") },
      { title: "International Society of Sports Nutrition Position Stand: protein and exercise", publisher: "Journal of the International Society of Sports Nutrition", year: 2017, url: pubmed("International Society of Sports Nutrition Position Stand: protein and exercise") },
      { title: "Evidence-based recommendations for optimal dietary protein intake in older people: a position paper from the PROT-AGE Study Group", publisher: "Journal of the American Medical Directors Association", year: 2013, url: pubmed("Evidence-based recommendations for optimal dietary protein intake in older people: a position paper from the PROT-AGE Study Group") },
    ],
    related: ["how-much-protein-do-you-need", "muscle-strength-and-aging"],
  },
  {
    slug: "water",
    name: "Water Intake Calculator",
    short: "Water",
    summary: "A rough daily fluid range for your size, activity and climate.",
    sticker: "bottle",
    color: "sky",
    category: "nutrition",
    keywords: "water hydration fluid intake litres liters cups daily",
    about: `There is no precise universal water requirement. Reference bodies set adequate intakes for total water from all drinks and food: about 2.0 liters a day for women and 2.5 for men in Europe (EFSA), and about 2.7 and 3.7 liters in the United States (National Academies). Around a fifth of that typically comes from food.

This calculator scales a common rule of thumb, about 30 to 35 mL per kilogram of body weight, and adds an allowance for exercise and heat, when sweat losses can range from under half a liter to well over a liter an hour.

For most healthy people, thirst is a good guide and pale-yellow urine is a sign you are getting enough. Tea, coffee and milk count toward the total. Drinking far beyond thirst during long exercise can dangerously dilute blood sodium, and people with heart, kidney or liver conditions may have fluid limits set by their doctor.`,
    sources: [
      { title: "Scientific Opinion on Dietary Reference Values for water", publisher: "European Food Safety Authority", year: 2010 },
      { title: "Dietary Reference Intakes for Water, Potassium, Sodium, Chloride, and Sulfate", publisher: "National Academies of Sciences, Engineering, and Medicine", year: 2005 },
    ],
    related: ["how-much-water-do-you-need"],
  },
  {
    slug: "heart-rate-zones",
    name: "Heart Rate Zone Calculator",
    short: "Heart rate zones",
    summary: "Your five training zones from age alone, or sharper ones if you know your resting heart rate.",
    sticker: "heart",
    color: "pink",
    category: "fitness",
    keywords: "heart rate zones max hr zone 2 karvonen training cardio bpm",
    about: `Training zones are bands of effort defined as a share of your maximum heart rate. This calculator estimates your maximum with the Tanaka formula, 208 minus 0.7 times your age, which was derived from a large pooled analysis and tends to be closer than the older "220 minus age" for adults.

If you enter your resting heart rate, zones are calculated with the heart rate reserve (Karvonen) method, which takes your fitness into account: target = resting + percentage x (maximum - resting).

Any formula can be off by 10 beats a minute or more for an individual, and some medicines, including beta blockers, lower heart rate. Check the numbers against how the effort feels: in zone 2 you can hold a conversation; in zone 4 you can manage only a few words.`,
    sources: [
      { title: "Age-predicted maximal heart rate revisited", publisher: "Journal of the American College of Cardiology", year: 2001, url: pubmed("Age-predicted maximal heart rate revisited") },
    ],
    related: ["zone-2-and-vo2-max", "resting-heart-rate-and-hrv", "hiit-vs-steady-state-cardio"],
  },
  {
    slug: "one-rep-max",
    name: "One-Rep Max Calculator",
    short: "One-rep max",
    summary: "Estimate your one-rep max from a weight you can lift for several reps, with a loading chart.",
    sticker: "dumbbell",
    color: "orange",
    category: "fitness",
    keywords: "1rm one rep max strength epley brzycki percent lifting",
    about: `Testing a true one-rep max is tiring and carries some risk, so lifters usually estimate it from a set taken close to failure. This calculator averages two widely used formulas: Epley (weight x (1 + reps / 30)) and Brzycki (weight x 36 / (37 - reps)).

Estimates are most accurate with 10 reps or fewer and for the big barbell lifts; they drift for high-rep sets and vary from person to person. Use the percentage chart to pick training loads rather than as a number to chase on a bad day.`,
    sources: [
      { title: "The accuracy of prediction equations for estimating 1-RM performance in the bench press, squat, and deadlift", publisher: "Journal of Strength and Conditioning Research", year: 1997 },
    ],
    related: ["progressive-overload", "strength-training-for-beginners"],
  },
  {
    slug: "body-fat",
    name: "Body Fat Calculator",
    short: "Body fat",
    summary: "Estimate body fat percentage from a tape measure using the US Navy circumference method.",
    sticker: "tape",
    color: "yellow",
    category: "metabolism",
    keywords: "body fat percentage navy method tape measure composition",
    about: `The US Navy method estimates body fat from circumferences: neck, waist and height for men; neck, waist, hips and height for women. It was developed on service members by Hodgdon and Beckett in 1984 and needs nothing but a tape measure.

Expect an error of around 3 to 4 percentage points against laboratory methods such as DXA, and more at the extremes. It is better at tracking change over time than at giving you an exact figure, so measure the same way each time: tape level, snug but not tight, at the end of a normal breath.`,
    sources: [
      { title: "Prediction of percent body fat for U.S. Navy men and women from body circumferences and height", publisher: "Naval Health Research Center", year: 1984 },
    ],
    related: ["bmi-waist-and-body-composition"],
  },
  {
    slug: "waist-to-height",
    name: "Waist-to-Height Ratio Calculator",
    short: "Waist-to-height",
    summary: "One tape measurement that flags central fat better than BMI. Aim to keep your waist under half your height.",
    sticker: "tape",
    color: "mint",
    category: "metabolism",
    keywords: "waist to height ratio central obesity abdominal fat whtr",
    about: `Fat carried around the middle is more strongly linked to heart disease and type 2 diabetes than fat elsewhere. Dividing your waist by your height captures that in one number, and it works across heights and for both sexes.

The UK's National Institute for Health and Care Excellence (NICE) recommends the measure for adults with a BMI under 35 and groups results as: 0.4 to 0.49 healthy central adiposity, 0.5 to 0.59 increased risk, and 0.6 or more high risk. The simple message: keep your waist to less than half your height.

Measure midway between the bottom of your ribs and the top of your hips, after breathing out normally. The ratio is not designed for pregnancy or for children under five.`,
    sources: [
      { title: "Overweight and obesity management (NG246)", publisher: "National Institute for Health and Care Excellence", year: 2025, url: "https://www.nice.org.uk/guidance/ng246" },
    ],
    related: ["bmi-waist-and-body-composition", "know-your-numbers"],
  },
  {
    slug: "sleep-cycles",
    name: "Sleep Cycle Calculator",
    short: "Sleep cycles",
    summary: "Work back from your alarm to find bedtimes that give you enough full sleep cycles.",
    sticker: "moon",
    color: "indigo",
    category: "sleep",
    keywords: "sleep cycle bedtime wake up time calculator 90 minutes",
    about: `Sleep runs in cycles of roughly 90 minutes that move through light sleep, deep sleep and REM. Waking near the end of a cycle, when sleep is lighter, tends to feel easier than being pulled out of deep sleep.

This calculator counts back in 90-minute blocks and allows about 15 minutes to fall asleep. Real cycles vary from about 70 to 120 minutes between people and across the night, so treat the times as a nudge, not a rule. The bigger lever is total sleep: most adults need at least seven hours, and a consistent wake-up time does more for your body clock than any cycle maths.`,
    sources: [
      { title: "Recommended Amount of Sleep for a Healthy Adult: A Joint Consensus Statement of the American Academy of Sleep Medicine and Sleep Research Society", publisher: "Sleep", year: 2015, url: pubmed("Recommended Amount of Sleep for a Healthy Adult: A Joint Consensus Statement of the American Academy of Sleep Medicine and Sleep Research Society") },
    ],
    related: ["how-much-sleep-do-you-need", "sleep-hygiene-habits-that-work"],
  },
  {
    slug: "due-date",
    name: "Pregnancy Due Date Calculator",
    short: "Due date",
    summary: "Estimate a due date from your last period, conception date or IVF transfer.",
    sticker: "calendar",
    color: "rose",
    category: "womens-health",
    keywords: "pregnancy due date edd naegele gestational age weeks trimester ivf",
    about: `The standard estimate, Naegele's rule, adds 280 days (40 weeks) to the first day of your last menstrual period, assuming a 28-day cycle with ovulation on day 14. This calculator adjusts for longer or shorter cycles, and can also work from a known conception date (plus 266 days) or an IVF embryo transfer date.

A due date is an estimate: only a small minority of babies arrive on the day itself, and birth anywhere from 37 to 42 weeks is common. An early ultrasound measurement is more accurate than period dates, and your maternity team may revise the date after your first scan.`,
    sources: [
      { title: "Methods for Estimating the Due Date (Committee Opinion No. 700)", publisher: "American College of Obstetricians and Gynecologists", year: 2017, url: pubmed("Committee Opinion No 700: Methods for Estimating the Due Date") },
    ],
    related: ["pregnancy-nutrition-and-exercise", "menstrual-cycle-explained"],
  },
  {
    slug: "blood-pressure",
    name: "Blood Pressure Checker",
    short: "Blood pressure",
    summary: "See which category a reading falls into and what guidelines suggest doing next.",
    sticker: "heart",
    color: "pink",
    category: "heart-health",
    keywords: "blood pressure reading category hypertension systolic diastolic",
    about: `This checker uses the categories from the American Heart Association and American College of Cardiology guideline: normal (below 120 and below 80), elevated (120 to 129 and below 80), stage 1 hypertension (130 to 139 or 80 to 89) and stage 2 (140 or higher, or 90 or higher). When the two numbers fall in different categories, the higher category applies.

Many other bodies, including the World Health Organization, define hypertension as 140/90 mm Hg or higher, so a stage 1 reading under the US system may be described differently where you live.

One reading is not a diagnosis. Blood pressure rises with stress, caffeine, a full bladder and talking. Sit quietly for five minutes with your back supported, feet flat and arm at heart level, take two readings a minute apart, and look at the average over several days.`,
    sources: [
      { title: "Understanding Blood Pressure Readings", publisher: "American Heart Association", url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings" },
      { title: "Hypertension", publisher: "World Health Organization", url: "https://www.who.int/news-room/fact-sheets/detail/hypertension" },
    ],
    related: ["blood-pressure-numbers-explained", "dash-diet-and-salt"],
  },
  {
    slug: "calories-burned",
    name: "Calories Burned Calculator",
    short: "Calories burned",
    summary: "Estimate the energy cost of walking, running, lifting and 25 other activities.",
    sticker: "sneaker",
    color: "orange",
    category: "fitness",
    keywords: "calories burned exercise met activity energy expenditure walking running",
    about: `Exercise scientists describe the intensity of an activity in METs, or metabolic equivalents: 1 MET is roughly the energy you use sitting quietly. Brisk walking is around 4 METs; running at 10 km/h is around 10. Energy used is approximately MET x body weight (kg) x hours.

MET values here are taken from the Compendium of Physical Activities, the standard research reference. They are averages for typical adults: your own burn depends on fitness, technique, terrain and body composition, and can easily differ by 10 to 20%. Fitness trackers and gym machines make similar assumptions.`,
    sources: [
      { title: "2011 Compendium of Physical Activities: a second update of codes and MET values", publisher: "Medicine & Science in Sports & Exercise", year: 2011, url: pubmed("2011 Compendium of Physical Activities: a second update of codes and MET values") },
    ],
    related: ["how-much-exercise-do-you-need", "metabolism-101"],
  },
  {
    slug: "pace",
    name: "Running Pace Calculator",
    short: "Pace",
    summary: "Convert between time, distance and pace, and predict times for other race distances.",
    sticker: "stopwatch",
    color: "yellow",
    category: "fitness",
    keywords: "running pace calculator race time 5k 10k marathon speed km mile",
    about: `Pace is simply time divided by distance. Enter any distance and finish time to see your pace per kilometer and per mile, and your average speed.

Race predictions use Riegel's formula, which estimates that time grows slightly faster than distance: T2 = T1 x (D2 / D1) ^ 1.06. It works best between similar distances and for runners who have trained for the longer event. Marathon predictions from a 5K are usually optimistic unless your weekly mileage supports them.`,
    sources: [
      { title: "Athletic Records and Human Endurance", publisher: "American Scientist", year: 1981 },
    ],
    related: ["running-injuries-prevention", "zone-2-and-vo2-max"],
  },
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
