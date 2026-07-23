import "server-only";
import { sql } from "@/lib/db";

// Phase 5 — generic style child-objects (Artwork, Size Chart, Spec Sheet, Test
// Run) share one table; `kind` discriminates and `data` holds kind-specific keys.

export const STYLE_OBJECT_KINDS = ["artwork", "size_chart", "spec_sheet", "test_run"] as const;
export type StyleObjectKind = (typeof STYLE_OBJECT_KINDS)[number];

const CODE_PREFIX: Record<StyleObjectKind, string> = {
  artwork: "ART",
  size_chart: "SZC",
  spec_sheet: "SPC",
  test_run: "TST",
};

export function isStyleObjectKind(v: unknown): v is StyleObjectKind {
  return typeof v === "string" && (STYLE_OBJECT_KINDS as readonly string[]).includes(v);
}

export type DbStyleObject = {
  id: string;
  style_id: string;
  kind: StyleObjectKind;
  code: string | null;
  seq: number;
  name: string | null;
  description: string | null;
  phase: string;
  state: string;
  data: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  modified_at: string;
};

export async function getStyleObjects(
  styleId: string,
  kind: StyleObjectKind,
): Promise<DbStyleObject[]> {
  return (await sql`
    SELECT id, style_id, kind, code, seq, name, description, phase, state, data,
           created_by, created_at, modified_at
    FROM style_objects WHERE style_id = ${styleId} AND kind = ${kind}
    ORDER BY seq ASC
  `) as DbStyleObject[];
}

export async function getStyleObjectById(id: string): Promise<DbStyleObject | null> {
  const rows = (await sql`
    SELECT id, style_id, kind, code, seq, name, description, phase, state, data,
           created_by, created_at, modified_at
    FROM style_objects WHERE id = ${id} LIMIT 1
  `) as DbStyleObject[];
  return rows[0] ?? null;
}

export type StyleObjectInput = {
  name: string | null;
  description: string | null;
  phase?: string;
  state?: string;
  data?: Record<string, unknown>;
};

export async function createStyleObject(
  styleId: string,
  kind: StyleObjectKind,
  input: StyleObjectInput & { createdBy: string; createdById: string },
): Promise<DbStyleObject> {
  const rows0 = (await sql`
    SELECT COALESCE(MAX(seq), 0) AS max_seq FROM style_objects
    WHERE style_id = ${styleId} AND kind = ${kind}
  `) as Array<{ max_seq: number }>;
  const seq = Number(rows0[0]?.max_seq ?? 0) + 1;
  const code = `${CODE_PREFIX[kind]}-${String(seq).padStart(3, "0")}`;
  const rows = (await sql`
    INSERT INTO style_objects (style_id, kind, code, seq, name, description, phase, state, data, created_by, created_by_id)
    VALUES (${styleId}, ${kind}, ${code}, ${seq}, ${input.name}, ${input.description},
            ${input.phase ?? "Production"}, ${input.state ?? "draft"},
            ${JSON.stringify(input.data ?? {})}::jsonb, ${input.createdBy}, ${input.createdById})
    RETURNING id, style_id, kind, code, seq, name, description, phase, state, data,
              created_by, created_at, modified_at
  `) as DbStyleObject[];
  return rows[0];
}

export async function updateStyleObject(
  id: string,
  patch: Partial<StyleObjectInput>,
): Promise<DbStyleObject | null> {
  const has = (k: string) => Object.prototype.hasOwnProperty.call(patch, k);
  await sql`
    UPDATE style_objects SET
      name = CASE WHEN ${has("name")} THEN ${patch.name ?? null} ELSE name END,
      description = CASE WHEN ${has("description")} THEN ${patch.description ?? null} ELSE description END,
      phase = CASE WHEN ${has("phase")} THEN ${patch.phase ?? "Production"} ELSE phase END,
      state = CASE WHEN ${has("state")} THEN ${patch.state ?? "draft"} ELSE state END,
      data = CASE WHEN ${has("data")} THEN ${JSON.stringify(patch.data ?? {})}::jsonb ELSE data END,
      modified_at = now()
    WHERE id = ${id}
  `;
  return getStyleObjectById(id);
}

export async function deleteStyleObject(id: string): Promise<void> {
  await sql`DELETE FROM style_objects WHERE id = ${id}`;
}

// ── Role assignment ─────────────────────────────────────────────────────────

export const ASSIGN_ROLES = ["designer", "buyer", "technologist", "sourcing"] as const;
export type AssignRole = (typeof ASSIGN_ROLES)[number];

export function isAssignRole(v: unknown): v is AssignRole {
  return typeof v === "string" && (ASSIGN_ROLES as readonly string[]).includes(v);
}

export async function assignStyle(
  styleId: string,
  role: AssignRole | null,
  comment: string | null,
): Promise<void> {
  await sql`
    UPDATE styles
    SET assigned_role = ${role}, assigned_at = now(), assignment_comment = ${comment}
    WHERE id = ${styleId}
  `;
}

// Reference lists that the Phase-5 forms select from.
export async function getSpecOptions(): Promise<{
  specTypes: string[];
  sizeRanges: string[];
  sizeChartTemplates: string[];
  sealers: string[];
}> {
  const names = async (table: string) =>
    ((await sql.query(`SELECT name FROM ${table} WHERE active ORDER BY sort, name`)) as Array<{
      name: string;
    }>).map((r) => r.name);
  const [specTypes, sizeRanges, sizeChartTemplates, sealers] = await Promise.all([
    names("spec_types"),
    names("size_ranges"),
    names("size_chart_templates"),
    names("sealers"),
  ]);
  return { specTypes, sizeRanges, sizeChartTemplates, sealers };
}
