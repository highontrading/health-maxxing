/**
 * Validates content/ and loads it into the database.
 *
 *   npx tsx scripts/sync-content.ts           # create new rows, update changed seed rows
 *   npx tsx scripts/sync-content.ts --force   # also overwrite rows edited in the admin panel
 *   npx tsx scripts/sync-content.ts --prune   # delete untouched seed rows whose file is gone
 *   npx tsx scripts/sync-content.ts --quiet   # print only problems
 *
 * Runs automatically before `npm run dev`, `npm run build` and `npm start`.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", { info: () => {}, error: console.error });

async function main() {
  const args = new Set(process.argv.slice(2));
  const quiet = args.has("--quiet");
  const { syncContent } = await import("../src/lib/content/sync");
  const { databaseUrl } = await import("../src/lib/db");

  const started = Date.now();
  const { report, content } = await syncContent({
    force: args.has("--force"),
    prune: args.has("--prune"),
    log: (line) => console.log(line),
  });

  const errors = content.issues.filter((i) => i.level === "error");
  if (errors.length) {
    console.log(`\n${errors.length} content error(s). Affected files were skipped:`);
    for (const e of errors.slice(0, 40)) console.log(`  ${e.file}: ${e.message}`);
    if (errors.length > 40) console.log(`  …and ${errors.length - 40} more. Run npm run content:check for the full list.`);
  }

  if (!quiet) {
    const url = databaseUrl().replace(/\?.*$/, "");
    console.log(`\nContent synced to ${url.startsWith("file:") ? url : new URL(url).host} in ${Date.now() - started} ms`);
    for (const [table, s] of Object.entries(report)) {
      const parts = [
        s.created && `${s.created} created`,
        s.updated && `${s.updated} updated`,
        s.kept && `${s.kept} kept (edited in admin)`,
        s.pruned && `${s.pruned} pruned`,
        `${s.unchanged} unchanged`,
      ].filter(Boolean);
      console.log(`  ${table.padEnd(18)} ${parts.join(", ")}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
