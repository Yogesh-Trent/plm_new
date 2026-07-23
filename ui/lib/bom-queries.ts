import "server-only";
import { sql } from "@/lib/db";

// Phase 4 — Bill of Materials data access (server-only).

export type DbBom = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  created_by: string | null;
  created_by_id: string | null;
  created_at: string;
  line_count: number;
  combo_count: number;
};

export type DbBomLine = {
  id: string;
  bom_id: string;
  seq: number;
  component: string | null;
  category: string | null;
  material: string | null;
  colour: string | null;
  detail: string | null;
  quantity: string | null;
  uom: string | null;
};

export type DbBomCombo = {
  combo_id: string;
  name: string;
  combo_code: string | null;
  style_id: string;
  style_name: string | null;
  style_code: string | null;
};

const BOM_SELECT = `
  b.id, b.name, b.code, b.description, b.status, b.created_by, b.created_by_id,
  b.created_at,
  (SELECT COUNT(*)::int FROM bom_lines l WHERE l.bom_id = b.id) AS line_count,
  (SELECT COUNT(*)::int FROM bom_combos bc WHERE bc.bom_id = b.id) AS combo_count
`;

export async function getBoms(): Promise<DbBom[]> {
  return (await sql.query(
    `SELECT ${BOM_SELECT} FROM boms b ORDER BY b.created_at DESC`,
  )) as DbBom[];
}

export async function getBomById(id: string): Promise<DbBom | null> {
  const rows = (await sql.query(
    `SELECT ${BOM_SELECT} FROM boms b WHERE b.id = $1 LIMIT 1`,
    [id],
  )) as DbBom[];
  return rows[0] ?? null;
}

export async function createBom(input: {
  name: string;
  description: string | null;
  createdBy: string;
  createdById: string;
}): Promise<DbBom> {
  const countRows = (await sql`SELECT COUNT(*)::int AS n FROM boms`) as Array<{ n: number }>;
  const code = `BOM-${String((countRows[0]?.n ?? 0) + 1).padStart(5, "0")}`;
  const rows = (await sql`
    INSERT INTO boms (name, code, description, created_by, created_by_id)
    VALUES (${input.name}, ${code}, ${input.description}, ${input.createdBy}, ${input.createdById})
    RETURNING id
  `) as Array<{ id: string }>;
  return (await getBomById(rows[0].id))!;
}

export async function updateBom(
  id: string,
  patch: { name?: string; description?: string | null; status?: string },
): Promise<DbBom | null> {
  const has = (k: string) => Object.prototype.hasOwnProperty.call(patch, k);
  await sql`
    UPDATE boms SET
      name = CASE WHEN ${has("name")} THEN ${patch.name ?? null} ELSE name END,
      description = CASE WHEN ${has("description")} THEN ${patch.description ?? null} ELSE description END,
      status = CASE WHEN ${has("status")} THEN ${patch.status ?? "active"} ELSE status END
    WHERE id = ${id}
  `;
  return getBomById(id);
}

export async function deleteBom(id: string): Promise<void> {
  await sql`DELETE FROM boms WHERE id = ${id}`;
}

// ── Lines ───────────────────────────────────────────────────────────────────

export async function getBomLines(bomId: string): Promise<DbBomLine[]> {
  return (await sql`
    SELECT id, bom_id, seq, component, category, material, colour, detail,
           quantity, uom
    FROM bom_lines WHERE bom_id = ${bomId} ORDER BY seq ASC
  `) as DbBomLine[];
}

export type BomLineInput = {
  component: string | null;
  category: string | null;
  material: string | null;
  colour: string | null;
  detail: string | null;
  quantity: string | null;
  uom: string | null;
};

export async function createBomLine(
  bomId: string,
  input: BomLineInput,
): Promise<DbBomLine> {
  const maxRows = (await sql`
    SELECT COALESCE(MAX(seq), 0) AS max_seq FROM bom_lines WHERE bom_id = ${bomId}
  `) as Array<{ max_seq: number }>;
  const seq = Number(maxRows[0]?.max_seq ?? 0) + 1;
  const rows = (await sql`
    INSERT INTO bom_lines (bom_id, seq, component, category, material, colour, detail, quantity, uom)
    VALUES (${bomId}, ${seq}, ${input.component}, ${input.category}, ${input.material},
            ${input.colour}, ${input.detail}, ${input.quantity}, ${input.uom})
    RETURNING id, bom_id, seq, component, category, material, colour, detail, quantity, uom
  `) as DbBomLine[];
  return rows[0];
}

export async function getBomLineById(id: string): Promise<DbBomLine | null> {
  const rows = (await sql`
    SELECT id, bom_id, seq, component, category, material, colour, detail, quantity, uom
    FROM bom_lines WHERE id = ${id} LIMIT 1
  `) as DbBomLine[];
  return rows[0] ?? null;
}

export async function updateBomLine(
  id: string,
  patch: Partial<BomLineInput>,
): Promise<DbBomLine | null> {
  const has = (k: keyof BomLineInput) =>
    Object.prototype.hasOwnProperty.call(patch, k);
  await sql`
    UPDATE bom_lines SET
      component = CASE WHEN ${has("component")} THEN ${patch.component ?? null} ELSE component END,
      category = CASE WHEN ${has("category")} THEN ${patch.category ?? null} ELSE category END,
      material = CASE WHEN ${has("material")} THEN ${patch.material ?? null} ELSE material END,
      colour = CASE WHEN ${has("colour")} THEN ${patch.colour ?? null} ELSE colour END,
      detail = CASE WHEN ${has("detail")} THEN ${patch.detail ?? null} ELSE detail END,
      quantity = CASE WHEN ${has("quantity")} THEN ${patch.quantity ?? null} ELSE quantity END,
      uom = CASE WHEN ${has("uom")} THEN ${patch.uom ?? null} ELSE uom END
    WHERE id = ${id}
  `;
  return getBomLineById(id);
}

export async function deleteBomLine(id: string): Promise<void> {
  await sql`DELETE FROM bom_lines WHERE id = ${id}`;
}

// ── Combo ↔ BOM membership ──────────────────────────────────────────────────

export async function getBomCombos(bomId: string): Promise<DbBomCombo[]> {
  return (await sql`
    SELECT cc.id AS combo_id, cc.name, cc.combo_code, s.id AS style_id,
           s.style_name, s.style_code
    FROM bom_combos bc
    JOIN color_combos cc ON cc.id = bc.combo_id
    JOIN styles s ON s.id = cc.style_id
    WHERE bc.bom_id = ${bomId}
    ORDER BY bc.added_at DESC
  `) as DbBomCombo[];
}

// All BOMs + which ones a given combo currently belongs to (for the picker).
export async function getBomsForCombo(
  comboId: string,
): Promise<{ boms: Array<{ id: string; name: string; code: string | null }>; attachedIds: string[] }> {
  const boms = (await sql`
    SELECT id, name, code FROM boms ORDER BY created_at DESC
  `) as Array<{ id: string; name: string; code: string | null }>;
  const attached = (await sql`
    SELECT bom_id FROM bom_combos WHERE combo_id = ${comboId}
  `) as Array<{ bom_id: string }>;
  return { boms, attachedIds: attached.map((r) => r.bom_id) };
}

// Reconcile a combo's BOM memberships to exactly `bomIds`.
export async function setComboBoms(
  comboId: string,
  bomIds: string[],
  addedBy: string,
): Promise<void> {
  await sql`DELETE FROM bom_combos WHERE combo_id = ${comboId}`;
  for (const bomId of bomIds) {
    await sql`
      INSERT INTO bom_combos (bom_id, combo_id, added_by)
      VALUES (${bomId}, ${comboId}, ${addedBy})
      ON CONFLICT (bom_id, combo_id) DO NOTHING
    `;
  }
}
