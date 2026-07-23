import "server-only";
import { sql } from "@/lib/db";

// Admin-managed reference lists. The URL slug maps to a FIXED table name via this
// whitelist, so the table name is never taken from user input (no SQL injection).
export const REF_TABLES: Record<string, string> = {
  departments: "departments",
  brands: "brands",
  "product-types": "product_types",
  "style-types": "style_types",
  templates: "templates",
  "colorway-selections": "colorway_selections",
  "color-palettes": "color_palettes",
  "spec-types": "spec_types",
  "size-ranges": "size_ranges",
  "size-chart-templates": "size_chart_templates",
  sealers: "sealers",
  vendors: "vendors",
  "supplier-request-templates": "supplier_request_templates",
  "data-package-templates": "data_package_templates",
  "holiday-calendars": "holiday_calendars",
  "critical-paths": "critical_paths",
  "sample-types": "sample_types",
  "inspection-types": "inspection_types",
};

export const REF_LABELS: Record<string, string> = {
  departments: "Departments",
  brands: "Brands / Divisions",
  "product-types": "Product types",
  "style-types": "Style types",
  templates: "Templates",
  "colorway-selections": "Colorway selections",
  "color-palettes": "Colour palettes",
  "spec-types": "Spec types",
  "size-ranges": "Size ranges",
  "size-chart-templates": "Size chart templates",
  sealers: "Sealers",
  vendors: "Vendors",
  "supplier-request-templates": "Supplier request templates",
  "data-package-templates": "Data package templates",
  "holiday-calendars": "Holiday calendars",
  "critical-paths": "Critical paths",
  "sample-types": "Sample types",
  "inspection-types": "Inspection types",
};

export type RefItem = { id: string; name: string; sort: number; active: boolean };

export function refTable(slug: string): string | null {
  return REF_TABLES[slug] ?? null;
}

export async function listRef(table: string): Promise<RefItem[]> {
  return (await sql.query(
    `SELECT id, name, sort, active FROM ${table} ORDER BY sort, name`,
  )) as RefItem[];
}

export async function createRef(table: string, name: string): Promise<RefItem> {
  const rows = (await sql.query(
    `INSERT INTO ${table} (name, sort)
     VALUES ($1, COALESCE((SELECT MAX(sort) FROM ${table}), 0) + 10)
     RETURNING id, name, sort, active`,
    [name],
  )) as RefItem[];
  return rows[0];
}

export async function updateRef(
  table: string,
  id: string,
  patch: { name?: string; active?: boolean },
): Promise<RefItem | null> {
  const hasName = typeof patch.name === "string";
  const hasActive = typeof patch.active === "boolean";
  const rows = (await sql.query(
    `UPDATE ${table} SET
       name = CASE WHEN $2 THEN $3 ELSE name END,
       active = CASE WHEN $4 THEN $5 ELSE active END
     WHERE id = $1
     RETURNING id, name, sort, active`,
    [id, hasName, patch.name ?? null, hasActive, patch.active ?? null],
  )) as RefItem[];
  return rows[0] ?? null;
}

export async function deleteRef(table: string, id: string): Promise<void> {
  await sql.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
}
