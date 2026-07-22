// Apply db/schema.sql to Neon. Run: `npm run db:migrate`
// Uses the Neon HTTP driver; schema.sql is split into single statements
// (no dollar-quoted bodies, so a simple `;` split is safe here).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { neon } from "@neondatabase/serverless";

const here = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(here, "..", "db", "schema.sql"), "utf8");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing. Run with: node --env-file=.env scripts/migrate.mjs");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Strip full-line `--` comments first, THEN split — otherwise a comment that
// precedes a statement would swallow the statement in its chunk.
const statements = schema
  .split(/\r?\n/)
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(/;\s*(?:\r?\n|$)/)
  .map((s) => s.trim())
  .filter((s) => s.length);

let applied = 0;
for (const statement of statements) {
  await sql.query(statement);
  applied += 1;
}
console.log(`Migration complete — ${applied} statements applied.`);
