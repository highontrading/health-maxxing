/**
 * Prints the editorial plan in a compact form.
 *
 *   npx tsx scripts/plan.ts                 # every slug, one line each (for linking)
 *   npx tsx scripts/plan.ts nutrition sleep # full briefs for those article categories
 *   npx tsx scripts/plan.ts --system heart-circulation   # conditions in a body system
 */
import fs from "node:fs";
import path from "node:path";

type Plan = {
  tools: string[];
  articles: { category: string; slug: string; title: string; sticker: string; kind: string; featured?: boolean; brief: string }[];
  conditions: { slug: string; name: string; system: string; category: string }[];
};
const root = path.join(process.cwd(), "content");
const plan = JSON.parse(fs.readFileSync(path.join(root, "plan.json"), "utf8")) as Plan;
const args = process.argv.slice(2);
const systemIdx = args.indexOf("--system");

if (systemIdx >= 0) {
  const systems = args.slice(systemIdx + 1);
  for (const c of plan.conditions.filter((c) => systems.includes(c.system))) {
    const done = fs.existsSync(path.join(root, "conditions", `${c.slug}.md`)) ? "DONE " : "";
    console.log(`${done}${c.slug} | ${c.name} | system: ${c.system} | category: ${c.category}`);
  }
} else if (args.length) {
  for (const a of plan.articles.filter((a) => args.includes(a.category))) {
    const done = fs.existsSync(path.join(root, "articles", a.category, `${a.slug}.md`)) ? " [ALREADY WRITTEN]" : "";
    console.log(`\n### ${a.category}/${a.slug}${done}`);
    console.log(`title: ${a.title}`);
    console.log(`sticker: ${a.sticker} | kind: ${a.kind}${a.featured ? " | featured: true" : ""}`);
    console.log(`brief: ${a.brief}`);
  }
} else {
  console.log("ARTICLES (/articles/<slug>)");
  let cat = "";
  for (const a of plan.articles) {
    if (a.category !== cat) {
      cat = a.category;
      console.log(`  [${cat}]`);
    }
    console.log(`    ${a.slug}`);
  }
  console.log("\nCONDITIONS (/conditions/<slug>)");
  console.log("  " + plan.conditions.map((c) => c.slug).join(", "));
  console.log("\nTOOLS (/tools/<slug>)");
  console.log("  " + plan.tools.join(", "));
  console.log("\nOTHER PAGES: /exercises /foods /glossary /myths /body /tools /conditions /topics/<category> /newsletter /community");
}
