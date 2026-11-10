/**
 * Validates everything under content/.
 *
 *   npx tsx scripts/validate-content.ts                 # everything
 *   npx tsx scripts/validate-content.ts articles/sleep  # only files whose path contains this text
 *   npx tsx scripts/validate-content.ts --strict        # warnings also fail
 *   npx tsx scripts/validate-content.ts --coverage      # list planned pieces that are still missing
 */
import { loadContent } from "../src/lib/content/load";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const coverage = args.includes("--coverage");
const filters = args.filter((a) => !a.startsWith("--"));

const content = loadContent();
const matches = (file: string) => filters.length === 0 || filters.some((f) => file.includes(f));

const issues = content.issues.filter((i) => matches(i.file));
const errors = issues.filter((i) => i.level === "error");
const warnings = issues.filter((i) => i.level === "warn");

const byFile = new Map<string, typeof issues>();
for (const issue of issues) {
  if (!byFile.has(issue.file)) byFile.set(issue.file, []);
  byFile.get(issue.file)!.push(issue);
}
for (const [file, list] of byFile) {
  console.log(`\n${file}`);
  for (const i of list) console.log(`  ${i.level === "error" ? "ERROR" : "warn "}  ${i.message}`);
}

const counted = {
  articles: content.articles.filter((a) => matches(a.file)).length,
  conditions: content.conditions.filter((c) => matches(c.file)).length,
  glossary: content.glossary.length,
  myths: content.myths.length,
  foods: content.foods.length,
  exercises: content.exercises.length,
  newsletter: content.newsletter.length,
  pages: content.pages.length,
};
console.log(
  `\nChecked: ${counted.articles} articles, ${counted.conditions} conditions` +
    (filters.length
      ? ""
      : `, ${counted.glossary} glossary terms, ${counted.myths} myths, ${counted.foods} foods, ${counted.exercises} exercises, ${counted.newsletter} newsletter issues, ${counted.pages} pages`),
);

if (coverage) {
  const haveA = new Set(content.articles.map((a) => a.slug));
  const haveC = new Set(content.conditions.map((c) => c.slug));
  const missingA = content.plan.articles.filter((a) => !haveA.has(a.slug));
  const missingC = content.plan.conditions.filter((c) => !haveC.has(c.slug));
  console.log(`\nPlanned articles written: ${content.plan.articles.length - missingA.length}/${content.plan.articles.length}`);
  for (const a of missingA) console.log(`  missing article   ${a.category}/${a.slug}`);
  console.log(`Planned conditions written: ${content.plan.conditions.length - missingC.length}/${content.plan.conditions.length}`);
  for (const c of missingC) console.log(`  missing condition ${c.slug}`);
}

console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
if (errors.length || (strict && warnings.length)) process.exit(1);
