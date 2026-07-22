// Seed one user + one run (+ approvals, style, supplier, sku ratios, audit) per
// role from app/data/prototype.json. Idempotent. Run: `npm run db:seed`
import { neon } from "@neondatabase/serverless";
import data from "../app/data/prototype.json" with { type: "json" };

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing. Run with: node --env-file=.env scripts/seed.mjs");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

const ROLES = ["designer", "buyer", "technologist", "all"];
const LABEL = { designer: "Designer", buyer: "Buyer", technologist: "Technologist", all: "All" };

const season = data.run?.season ?? "Zudio AW 26";
const division = data.run?.division ?? "Menswear";
const approvals = Array.isArray(data.approvals) ? data.approvals : [];
// Known reconciled allocation from the prototype (sums to 15,511).
const skuRatio = [
  ["28 / XS", 1551], ["30 / S", 3102], ["32 / M", 3878],
  ["34 / L", 3102], ["36 / XL", 2327], ["38 / XXL", 1551],
];

for (const role of ROLES) {
  const email = `${role}@plm.local`;
  const [user] = await sql.query(
    `INSERT INTO users (name, email, role) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [`${LABEL[role]} (demo)`, email, role],
  );

  const [run] = await sql.query(
    `INSERT INTO runs (role, created_by, season, division, mode, status, state)
     VALUES ($1, $2, $3, $4, 'automation', 'in_progress', '{}'::jsonb)
     ON CONFLICT (role) DO UPDATE SET season = EXCLUDED.season, division = EXCLUDED.division
     RETURNING id`,
    [role, user.id, season, division],
  );
  const runId = run.id;

  // Child rows: clear then re-insert so re-seeding stays clean.
  await sql.query(`DELETE FROM approvals WHERE run_id = $1`, [runId]);
  await sql.query(`DELETE FROM sku_ratios WHERE run_id = $1`, [runId]);
  await sql.query(`DELETE FROM styles WHERE run_id = $1`, [runId]);
  await sql.query(`DELETE FROM suppliers WHERE run_id = $1`, [runId]);

  let seq = 0;
  for (const [step, status, actor] of approvals) {
    seq += 1;
    await sql.query(
      `INSERT INTO approvals (run_id, step, seq, status, actor)
       VALUES ($1, $2, $3, $4, $5)`,
      [runId, step, seq, String(status ?? "waiting").toLowerCase(), actor || null],
    );
  }

  for (const [size, qty] of skuRatio) {
    await sql.query(
      `INSERT INTO sku_ratios (run_id, size, qty) VALUES ($1, $2, $3)`,
      [runId, size, qty],
    );
  }

  await sql.query(
    `INSERT INTO styles (run_id, season, department, colour, description)
     VALUES ($1, $2, $3, 'BLACK', $4)`,
    [runId, season, division, "W26D14 EA CHK 347001 T SHIRT NOV"],
  );

  await sql.query(
    `INSERT INTO suppliers (run_id, vendor_id, vendor, cost, mrp, hsn, vendor_type)
     VALUES ($1, '11301069', 'NZ SEASONAL WEAR PRIVATE LIMITED', 100, 999, '62033300', 'Domestic')`,
    [runId],
  );

  await sql.query(
    `INSERT INTO audit_log (run_id, actor, action, detail)
     VALUES ($1, $2, 'seed', $3::jsonb)`,
    [runId, `${LABEL[role]} (demo)`, JSON.stringify({ season, division })],
  );

  console.log(`Seeded ${role} → run ${runId}`);
}
console.log("Seed complete.");
