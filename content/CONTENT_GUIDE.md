# Health Maxxing content guide

Everything the site publishes at launch lives in this folder as plain files. `npm run content:sync`
loads them into the database; `npm run content:check` validates them. This guide is the contract for
anyone (human or AI) writing for the site.

Read it fully before writing. Then read the two exemplars:

- `content/articles/fitness/how-much-exercise-do-you-need.md`
- `content/conditions/high-blood-pressure.md`

## 1. Who we write for and how we sound

Health Maxxing is a health magazine for curious adults anywhere in the world. Readers are smart but
not medically trained. They want to know what is true, how sure we are, and what to do about it.

**Voice: the sharp, kind friend who actually read the studies.**

- Clear, warm, lightly witty. Never preachy, never breathless, never clinical for its own sake.
- Second person ("you"). Short paragraphs (2 to 4 sentences). Concrete examples and real numbers.
- Explain jargon the first time you use it. Prefer plain verbs to medical Latin.
- No moralizing about food, weight or bodies. No fear-mongering. No miracle language.
- Say how strong the evidence is. "A randomized trial found" and "observational studies link" are
  different claims; make the difference visible. If the evidence is mixed or weak, say so.
- Give effect sizes with context (who was studied, compared with what), not just "reduces risk".
- American English spelling (fiber, color, anemia, diarrhea, pediatric).
- Metric first, US units in parentheses where helpful: "5 km (3.1 miles)", "38 °C (100.4 °F)".
  Blood values in mg/dL with mmol/L in parentheses where both are in common use.
- Readers are international. Say "your local emergency number", not 911. When guidance differs by
  country, name the body ("US guidelines say…, the NHS says…").
- Avoid: superfood, detox, toxins, miracle, game-changer, "boost your immune system" (unless you
  are debunking the phrase), "studies show" without saying which.
- Do not overuse em dashes. Do not open with "In today's fast-paced world" or any variation.

## 2. Accuracy rules (non-negotiable)

1. **Every factual claim that a reader might act on must be supported by a listed source** and
   carry a citation marker.
2. **Never invent** a statistic, study, quote, expert, patient story, guideline or URL. If you
   cannot support a claim, leave it out.
3. **Verify before you write.** Use web search to confirm each number, threshold, guideline and
   year against a primary or authoritative source. Anchor facts in `plan.json` briefs are
   direction, not gospel: confirm them, and if a brief is wrong or out of date, write what the
   sources say.
4. **Every source URL must be real.** Only use a URL you have seen in a search result during this
   session, or a DOI you have confirmed (write it as `https://doi.org/<doi>`), or a PubMed Central
   link you have confirmed. Never guess a URL path.
5. **Source quality.** Use, in order of preference:
   - Guidelines and fact sheets from WHO and national health bodies (CDC, NIH institutes,
     MedlinePlus, FDA, USPSTF, NHS, NICE, EFSA, Health Canada and similar).
   - Professional societies (AHA, ACC, ESC, ADA, ACOG, AAD, AASM, ACSM, ISSN and similar).
   - Peer-reviewed systematic reviews, meta-analyses and major trials (link via DOI or PMC).
   - Cochrane reviews.
   - Sparingly: Mayo Clinic, Cleveland Clinic, Harvard Health, Johns Hopkins Medicine.
   - Never: Wikipedia, Healthline, WebMD, Verywell, Medical News Today, news articles, blogs,
     supplement sellers, forums.
6. **No diagnosis, no personal prescriptions.** Describe what guidelines recommend and what the
   options are. Do not give doses for prescription medicines. For over-the-counter medicines say
   "as directed on the label" rather than stating doses, except for established nutrient intakes
   and guideline figures (for example folic acid 400 mcg, creatine 3 to 5 g).
7. **Always tell readers when to seek care**, and flag emergencies clearly.
8. **Mental health pieces** must include a short crisis note: anyone thinking about harming
   themselves should contact local emergency services or a crisis line straight away
   (https://findahelpline.com lists services by country; cite it as a source if you mention it).
   Use non-stigmatizing language ("died by suicide", "person with schizophrenia").
9. **Original writing only.** Do not copy or closely paraphrase source text. Facts are free;
   sentences are not.
10. Do not add a generic medical disclaimer. The site template adds one to every page.

### Fact-check status

Every article and condition carries a `factCheck` field in its frontmatter:

- `factCheck: verified` — you confirmed every figure, threshold and source URL against the source
  in a live search during this session.
- `factCheck: pending` — anything else. This is the default when the field is missing.

Be honest about it. A `pending` piece is still published; the flag puts it in the admin's
"needs fact check" queue so an editor can verify it later.

### When live search is not available

Web search is rate-limited and sometimes unavailable. If you cannot verify online, you may still
write, but under stricter rules:

1. State only what you are confident is established, mainstream guidance. If you are unsure of an
   exact number, give the range you are sure of, say "about", or leave it out. Never guess.
2. Prefer guideline-level facts (what WHO, national agencies and major societies recommend) over
   single-study statistics. Name the organization and the year.
3. Sources must be one of:
   - a URL you saw in a search result earlier in the session;
   - a stable landing page of an authoritative body that you are highly confident exists, such as
     a WHO fact sheet (`https://www.who.int/news-room/fact-sheets/detail/<topic>`), an NHS
     conditions page (`https://www.nhs.uk/conditions/<name>/`), a MedlinePlus topic, an NIH
     institute health topic, an NIH Office of Dietary Supplements fact sheet, a USPSTF
     recommendation page, or a major professional society's patient page;
   - for a journal paper, a **PubMed title search link**:
     `https://pubmed.ncbi.nlm.nih.gov/?term=<exact paper title, URL-encoded with + for spaces>`.
     Do not write DOIs, PMIDs or PMC ids from memory: a wrong identifier points readers at the
     wrong paper.
4. Set `factCheck: pending` and list, in your hand-off report, the specific claims that most need
   checking.

## 3. Articles

Path: `content/articles/<category>/<slug>.md`. The slug and category come from `plan.json`.

```markdown
---
title: "How Much Exercise Do You Need? The Guidelines, Made Practical"
dek: "One or two sentences that make someone want to read on. 30 to 220 characters."
summary: "Plain one-sentence summary for cards and search results. 40 to 170 characters."
category: fitness
tags: [exercise, guidelines, cardio, strength]   # 3 to 7, lowercase
sticker: sneaker                                 # an id from content/stickers.json
kind: guide                                      # guide | explainer | how-to | list | deep-dive
featured: true                                   # only if the plan marks it featured
takeaways:                                       # 3 to 5 complete sentences
  - "…"
faqs:                                            # 2 to 5 real questions people ask
  - q: "…?"
    a: "A direct answer in 1 to 4 sentences."
sources:                                         # 4 to 12, numbered in this order
  - title: "Exact title of the page or paper"
    publisher: "World Health Organization"       # journal name for papers
    year: 2020
    url: "https://…"
related: [slug-one, slug-two]                    # optional, up to 4 article slugs from plan.json
factCheck: verified                              # verified | pending (see section 2)
---

One or two intro paragraphs with no heading. Hook the reader, then say what the piece covers.

## A section heading in sentence case

Body text with a citation.[^1] A second claim from another source.[^2]

> [!STAT] 150 min
> A short caption that explains the figure.[^1]

## The bottom line

Two to four sentences. What should the reader actually do?
```

Rules the validator enforces:

- Body length **900 to 1,500 words** (hard limits 800 and 2,000).
- Starts with intro text, has at least three `##` sections, and the last one is
  `## The bottom line`. Use `###` for sub-sections. Never use `#`.
- **Citations:** `[^n]` refers to source number `n` in the frontmatter list (1-based). Put the
  marker after the punctuation of the sentence it supports. At least 4 distinct sources must be
  cited, and every listed source should be cited at least once. Do not write footnote definitions
  in the body.
- **Callouts** (use 2 to 4 per article, where they help):

  ```markdown
  > [!TIP] Optional short title
  > Practical advice.

  > [!NOTE]
  > Context worth knowing.

  > [!WARNING]
  > A real risk or common mistake.

  > [!DOCTOR]
  > When to get medical help. Use for red flags.

  > [!STAT] 31%
  > What the number means. The figure after [!STAT] is at most 14 characters.
  ```

- **Tables** (GitHub Markdown) are welcome for comparisons and food or dose tables. Keep them to
  2 to 4 columns so they work on phones.
- **Links:** internal links only, as absolute paths, and only to pages that exist in `plan.json`:
  `/articles/<slug>`, `/conditions/<slug>`, `/tools/<slug>`, `/topics/<category>`, plus `/exercises`,
  `/foods`, `/glossary`, `/myths`, `/body`, `/tools`, `/conditions`. Aim for 2 to 5 natural internal
  links. Do not put external URLs in the body; cite them as sources instead.
- No images, no raw HTML.
- `faqs` answers are plain text (no Markdown, no citation markers).
- `takeaways` are plain text.

Structure that works: hook → what it is → what the evidence says (with numbers) → what to do in
practice → cautions and who should see a doctor → the bottom line.

## 4. Conditions

Path: `content/conditions/<slug>.md`. A condition page is a compact, reliable reference: 350 to 650
words (hard limits 320 and 750).

```markdown
---
name: "High Blood Pressure (Hypertension)"
aka: ["hypertension", "HTN"]          # optional, up to 6
system: heart-circulation              # from plan.json / body-systems.json
category: heart-health                 # from plan.json
summary: "One or two sentences, 40 to 220 characters."
symptoms:                              # 3 to 10 short phrases
  - "Usually no symptoms at all"
urgent:                                # 0 to 6 signs that need emergency care now
  - "Chest pain or pressure"
sources:                               # 3 to 8
  - title: "…"
    publisher: "…"
    year: 2025
    url: "https://…"
factCheck: pending                     # verified | pending (see section 2)
---

## What it is
## Symptoms
## Causes and risk factors
## Diagnosis
## Treatment
## Prevention and self-care
## When to see a doctor
```

Exactly these seven `##` sections, in this order, with these names. At least 2 distinct citations.
Link to a related article or tool when one exists in the plan. Treatment sections describe the
options doctors use; they do not tell the reader what to take.

## 5. Glossary, myths, foods, exercises (JSON)

Each folder holds one or more `.json` files, each a JSON array. File names are free.

**`content/glossary/*.json`**

```json
{ "term": "Glycemic index", "definition": "One to three plain sentences (30 to 420 characters).",
  "category": "nutrition", "seeAlso": ["Insulin"] }
```

**`content/myths/*.json`**

```json
{ "myth": "You need eight glasses of water a day",
  "verdict": "misleading",
  "answer": "One-sentence verdict (15 to 200 characters).",
  "explanation": "Two to four sentences on what the evidence says (80 to 700 characters).",
  "category": "nutrition", "sticker": "bottle",
  "sources": [{ "title": "…", "publisher": "…", "year": 2005, "url": "https://…" }] }
```

`verdict` is one of `false`, `misleading`, `partly-true`, `true`.

**`content/foods/*.json`** (values per 100 g, from USDA FoodData Central)

```json
{ "name": "Chicken breast, roasted", "group": "meat-poultry", "fdcId": 171477,
  "serving": { "label": "1 small breast", "grams": 120 },
  "per100g": { "kcal": 165, "protein": 31.0, "carbs": 0, "fiber": 0, "sugars": 0,
               "fat": 3.6, "satFat": 1.0, "sodiumMg": 74 },
  "micros": [{ "name": "Niacin (B3)", "amount": 13.7, "unit": "mg" }],
  "note": "One practical sentence (15 to 200 characters)." }
```

`group` is one of: vegetables, fruits, grains, legumes, nuts-seeds, meat-poultry, fish-seafood,
dairy-eggs, plant-proteins, oils-fats, snacks-sweets, drinks. Only include `fdcId` when you are
certain of it. Say in the name whether the food is raw, cooked, dried and so on.

**`content/exercises/*.json`**

```json
{ "name": "Goblet Squat", "type": "strength", "pattern": "squat",
  "muscles": { "primary": ["Quadriceps", "Glutes"], "secondary": ["Core"] },
  "equipment": ["dumbbell"], "level": "beginner",
  "summary": "What it trains and why it is useful (30 to 220 characters).",
  "steps": ["3 to 7 clear steps"], "cues": ["2 to 5 short coaching cues"],
  "mistakes": ["2 to 5 common mistakes"],
  "easier": "A regression.", "harder": "A progression." }
```

`type`: strength, cardio, core, mobility, balance. `level`: beginner, intermediate, advanced.
`equipment`: bodyweight, dumbbell, kettlebell, barbell, band, bench, pull-up bar, cable, machine,
medicine ball, jump rope, box, mat, foam roller, cardio machine.

## 6. Checking your work

```bash
npx tsx scripts/validate-content.ts articles/<category>   # only your files
npx tsx scripts/validate-content.ts conditions
npx tsx scripts/validate-content.ts --coverage            # what is still missing from the plan
```

Errors must be fixed. Warnings should be fixed unless there is a good reason (a warning about an
unfamiliar source host is fine if the source really is authoritative).

Before you finish, reread each piece once as a skeptical clinician and once as a tired reader on a
phone. Cut anything that is not true, not supported or not useful.
