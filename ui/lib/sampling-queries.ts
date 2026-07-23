import "server-only";
import { sql } from "@/lib/db";

// Phase 8 — Sampling & Inspection.

export type DbSample = {
  id: string;
  style_id: string;
  sample_code: string | null;
  seq: number;
  sealer: string | null;
  sample_type: string | null;
  vendor: string | null;
  status: string;
  sent_date: string | null;
  received_date: string | null;
  comments: string | null;
  created_by: string | null;
  created_at: string;
};

export type DbInspection = {
  id: string;
  po_id: string;
  inspection_code: string | null;
  seq: number;
  inspection_type: string | null;
  inspection_date: string | null;
  inspector: string | null;
  quantity_inspected: string | null;
  aql: string | null;
  result: string;
  comments: string | null;
  created_by: string | null;
  created_at: string;
};

// ── Samples ─────────────────────────────────────────────────────────────────

export async function getSamples(styleId: string): Promise<DbSample[]> {
  return (await sql`
    SELECT id, style_id, sample_code, seq, sealer, sample_type, vendor, status,
           sent_date, received_date, comments, created_by, created_at
    FROM samples WHERE style_id = ${styleId} ORDER BY seq ASC
  `) as DbSample[];
}

export async function getSampleById(id: string): Promise<DbSample | null> {
  const rows = (await sql`
    SELECT id, style_id, sample_code, seq, sealer, sample_type, vendor, status,
           sent_date, received_date, comments, created_by, created_at
    FROM samples WHERE id = ${id} LIMIT 1
  `) as DbSample[];
  return rows[0] ?? null;
}

export type SampleInput = {
  sealer: string | null;
  sampleType: string | null;
  vendor: string | null;
  comments: string | null;
};

export async function createSample(
  styleId: string,
  input: SampleInput & { createdBy: string; createdById: string },
): Promise<DbSample> {
  const maxRows = (await sql`SELECT COALESCE(MAX(seq),0) AS m FROM samples WHERE style_id = ${styleId}`) as Array<{
    m: number;
  }>;
  const seq = Number(maxRows[0]?.m ?? 0) + 1;
  const code = `SMP-${String(seq).padStart(3, "0")}`;
  const rows = (await sql`
    INSERT INTO samples (style_id, sample_code, seq, sealer, sample_type, vendor, comments, created_by, created_by_id)
    VALUES (${styleId}, ${code}, ${seq}, ${input.sealer}, ${input.sampleType}, ${input.vendor},
            ${input.comments}, ${input.createdBy}, ${input.createdById})
    RETURNING id, style_id, sample_code, seq, sealer, sample_type, vendor, status,
              sent_date, received_date, comments, created_by, created_at
  `) as DbSample[];
  return rows[0];
}

export async function updateSample(
  id: string,
  patch: Partial<SampleInput & { status: string }>,
): Promise<DbSample | null> {
  const has = (k: string) => Object.prototype.hasOwnProperty.call(patch, k);
  await sql`
    UPDATE samples SET
      sealer = CASE WHEN ${has("sealer")} THEN ${patch.sealer ?? null} ELSE sealer END,
      sample_type = CASE WHEN ${has("sampleType")} THEN ${patch.sampleType ?? null} ELSE sample_type END,
      vendor = CASE WHEN ${has("vendor")} THEN ${patch.vendor ?? null} ELSE vendor END,
      comments = CASE WHEN ${has("comments")} THEN ${patch.comments ?? null} ELSE comments END,
      status = CASE WHEN ${has("status")} THEN ${patch.status ?? "pending"} ELSE status END,
      received_date = CASE WHEN ${has("status")} AND ${patch.status === "approved" || patch.status === "rejected"}
                        THEN now() ELSE received_date END
    WHERE id = ${id}
  `;
  return getSampleById(id);
}

export async function deleteSample(id: string): Promise<void> {
  await sql`DELETE FROM samples WHERE id = ${id}`;
}

// ── Inspections ─────────────────────────────────────────────────────────────

export async function getInspections(poId: string): Promise<DbInspection[]> {
  return (await sql`
    SELECT id, po_id, inspection_code, seq, inspection_type, inspection_date,
           inspector, quantity_inspected, aql, result, comments, created_by, created_at
    FROM inspections WHERE po_id = ${poId} ORDER BY seq ASC
  `) as DbInspection[];
}

export async function getInspectionById(id: string): Promise<DbInspection | null> {
  const rows = (await sql`
    SELECT id, po_id, inspection_code, seq, inspection_type, inspection_date,
           inspector, quantity_inspected, aql, result, comments, created_by, created_at
    FROM inspections WHERE id = ${id} LIMIT 1
  `) as DbInspection[];
  return rows[0] ?? null;
}

export type InspectionInput = {
  inspectionType: string | null;
  inspectionDate: string | null;
  inspector: string | null;
  quantityInspected: number | null;
  aql: string | null;
  comments: string | null;
};

export async function createInspection(
  poId: string,
  input: InspectionInput & { createdBy: string; createdById: string },
): Promise<DbInspection> {
  const maxRows = (await sql`SELECT COALESCE(MAX(seq),0) AS m FROM inspections WHERE po_id = ${poId}`) as Array<{
    m: number;
  }>;
  const seq = Number(maxRows[0]?.m ?? 0) + 1;
  const code = `INS-${String(seq).padStart(3, "0")}`;
  const rows = (await sql`
    INSERT INTO inspections (po_id, inspection_code, seq, inspection_type, inspection_date,
      inspector, quantity_inspected, aql, comments, created_by, created_by_id)
    VALUES (${poId}, ${code}, ${seq}, ${input.inspectionType}, ${input.inspectionDate},
      ${input.inspector}, ${input.quantityInspected}, ${input.aql}, ${input.comments},
      ${input.createdBy}, ${input.createdById})
    RETURNING id, po_id, inspection_code, seq, inspection_type, inspection_date,
      inspector, quantity_inspected, aql, result, comments, created_by, created_at
  `) as DbInspection[];
  return rows[0];
}

export async function updateInspection(
  id: string,
  patch: Partial<InspectionInput & { result: string }>,
): Promise<DbInspection | null> {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const has = (k: string) => Object.prototype.hasOwnProperty.call(patch, k);
  await sql`
    UPDATE inspections SET
      inspection_type = CASE WHEN ${has("inspectionType")} THEN ${str(patch.inspectionType)} ELSE inspection_type END,
      inspector = CASE WHEN ${has("inspector")} THEN ${str(patch.inspector)} ELSE inspector END,
      aql = CASE WHEN ${has("aql")} THEN ${str(patch.aql)} ELSE aql END,
      comments = CASE WHEN ${has("comments")} THEN ${str(patch.comments)} ELSE comments END,
      result = CASE WHEN ${has("result")} THEN ${patch.result ?? "pending"} ELSE result END
    WHERE id = ${id}
  `;
  return getInspectionById(id);
}

export async function deleteInspection(id: string): Promise<void> {
  await sql`DELETE FROM inspections WHERE id = ${id}`;
}

export async function getSamplingOptions(): Promise<{
  sealers: string[];
  sampleTypes: string[];
  inspectionTypes: string[];
  vendors: string[];
}> {
  const names = async (table: string) =>
    ((await sql.query(`SELECT name FROM ${table} WHERE active ORDER BY sort, name`)) as Array<{
      name: string;
    }>).map((r) => r.name);
  const [sealers, sampleTypes, inspectionTypes, vendors] = await Promise.all([
    names("sealers"),
    names("sample_types"),
    names("inspection_types"),
    names("vendors"),
  ]);
  return { sealers, sampleTypes, inspectionTypes, vendors };
}
