import "server-only";
import { sql } from "@/lib/db";
import type { Role } from "@/lib/roles";

// Typed data-access helpers. All run server-side only.

export type DbUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type DbRun = {
  id: string;
  role: Role;
  season: string | null;
  division: string | null;
  mode: "automation" | "manual";
  status: string;
  state: Record<string, unknown>;
  updated_at: string;
};

export type DbApproval = {
  id: string;
  step: string;
  seq: number;
  status: string;
  actor: string | null;
  decided_at: string | null;
};

export type DbSeason = {
  id: string;
  name: string;
  generic: string | null;
  business_unit: string | null;
  department: string | null;
  image_url: string | null;
  season_complete_date: string | null;
  status: string;
  created_by: string | null;
  created_by_id: string | null;
  created_at: string;
  number_of_styles: number;
};

export async function getDepartments(): Promise<string[]> {
  const rows = (await sql`
    SELECT name FROM departments WHERE active ORDER BY sort, name
  `) as Array<{ name: string }>;
  return rows.map((r) => r.name);
}

// List seasons, newest first, with the live style count derived from styles.
export async function getSeasons(): Promise<DbSeason[]> {
  return (await sql`
    SELECT s.id, s.name, s.generic, s.business_unit, s.department, s.image_url,
           s.season_complete_date, s.status, s.created_by, s.created_by_id,
           s.created_at, COUNT(st.id)::int AS number_of_styles
    FROM seasons s
    LEFT JOIN styles st ON st.season_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `) as DbSeason[];
}

export async function getSeasonById(id: string): Promise<DbSeason | null> {
  const rows = (await sql`
    SELECT s.id, s.name, s.generic, s.business_unit, s.department, s.image_url,
           s.season_complete_date, s.status, s.created_by, s.created_by_id,
           s.created_at,
           (SELECT COUNT(*)::int FROM styles st WHERE st.season_id = s.id)
             AS number_of_styles
    FROM seasons s WHERE s.id = ${id} LIMIT 1
  `) as DbSeason[];
  return rows[0] ?? null;
}

export type SeasonInput = {
  name: string;
  generic: string | null;
  businessUnit: string | null;
  department: string | null;
  imageUrl: string | null;
  seasonCompleteDate: string | null;
  status: string;
};

export async function createSeason(
  input: SeasonInput & { createdBy: string; createdById: string },
): Promise<DbSeason> {
  const rows = (await sql`
    INSERT INTO seasons (name, generic, business_unit, department, image_url,
                         season_complete_date, status, created_by, created_by_id)
    VALUES (${input.name}, ${input.generic}, ${input.businessUnit},
            ${input.department}, ${input.imageUrl}, ${input.seasonCompleteDate},
            ${input.status}, ${input.createdBy}, ${input.createdById})
    RETURNING id, name, generic, business_unit, department, image_url,
              season_complete_date, status, created_by, created_by_id, created_at,
              0 AS number_of_styles
  `) as DbSeason[];
  return rows[0];
}

// Partial update. Only the columns present in `patch` are written (COALESCE keeps
// the rest). Ownership is checked by the caller before this runs.
export async function updateSeason(
  id: string,
  patch: Partial<SeasonInput>,
): Promise<DbSeason | null> {
  const has = (k: keyof SeasonInput) => Object.prototype.hasOwnProperty.call(patch, k);
  await sql`
    UPDATE seasons SET
      name = CASE WHEN ${has("name")} THEN ${patch.name ?? null} ELSE name END,
      generic = CASE WHEN ${has("generic")} THEN ${patch.generic ?? null} ELSE generic END,
      business_unit = CASE WHEN ${has("businessUnit")} THEN ${patch.businessUnit ?? null} ELSE business_unit END,
      department = CASE WHEN ${has("department")} THEN ${patch.department ?? null} ELSE department END,
      image_url = CASE WHEN ${has("imageUrl")} THEN ${patch.imageUrl ?? null} ELSE image_url END,
      season_complete_date = CASE WHEN ${has("seasonCompleteDate")} THEN ${patch.seasonCompleteDate ?? null} ELSE season_complete_date END,
      status = CASE WHEN ${has("status")} THEN ${patch.status ?? "active"} ELSE status END
    WHERE id = ${id}
  `;
  return getSeasonById(id);
}

export async function deleteSeason(id: string): Promise<void> {
  await sql`DELETE FROM seasons WHERE id = ${id}`;
}

// ── Step 2: Styles ─────────────────────────────────────────────────────────

export type DbStyle = {
  id: string;
  season_id: string | null;
  season_name: string | null;
  department: string | null;
  brand: string | null;
  product_type: string | null;
  style_type: string | null;
  template: string | null;
  template_id: string | null;
  style_name: string | null;
  style_code: string | null;
  matkl_description_3: string | null;
  business_unit: string | null;
  pack: string | null;
  drop_name: string | null;
  image_url: string | null;
  supplier_request: string | null;
  issue_date: string | null;
  color_combo: string | null;
  vendors: string | null;
  status: string;
  assigned_role: string | null;
  combo_count: number;
  created_by: string | null;
  created_by_id: string | null;
  created_at: string;
};

export type StyleOptions = {
  seasons: Array<{ id: string; name: string; generic: string | null; business_unit: string | null }>;
  departments: string[];
  brands: string[];
  productTypes: string[];
  styleTypes: string[];
  templates: Array<{ id: string; name: string }>;
  businessUnits: string[];
};

async function names(table: "brands" | "product_types" | "style_types") {
  const rows = (await sql.query(
    `SELECT name FROM ${table} WHERE active ORDER BY sort, name`,
  )) as Array<{ name: string }>;
  return rows.map((r) => r.name);
}

// Everything the Style form needs, in one round-trip. Only ACTIVE seasons are
// offered (per spec). Business-unit options come from existing seasons.
export async function getStyleOptions(): Promise<StyleOptions> {
  const [seasonRows, departments, brands, productTypes, styleTypes, templateRows] =
    await Promise.all([
      sql`SELECT id, name, generic, business_unit FROM seasons
          WHERE status = 'active' ORDER BY created_at DESC`,
      getDepartments(),
      names("brands"),
      names("product_types"),
      names("style_types"),
      sql`SELECT id, name FROM templates WHERE active ORDER BY sort, name`,
    ]);
  const seasons = seasonRows as StyleOptions["seasons"];
  const templates = templateRows as StyleOptions["templates"];
  const businessUnits = Array.from(
    new Set(
      seasons.map((s) => s.business_unit).filter((b): b is string => Boolean(b)),
    ),
  );
  return { seasons, departments, brands, productTypes, styleTypes, templates, businessUnits };
}

const STYLE_SELECT = `
  s.id, s.season_id, se.name AS season_name, s.department, s.brand,
  s.product_type, s.style_type, s.template, s.template_id, s.style_name,
  s.style_code, s.matkl_description_3, s.business_unit, s.pack, s.drop_name,
  s.image_url, s.supplier_request, s.issue_date, s.color_combo, s.vendors,
  s.status, s.assigned_role,
  (SELECT COUNT(*)::int FROM color_combos cc WHERE cc.style_id = s.id) AS combo_count,
  s.created_by, s.created_by_id, s.created_at
`;

// Only styles created through the Step-2 flow (created_by_id set) — this keeps
// the legacy per-run seed styles out of the process list. Optional `assignedRole`
// filters to a role's worklist ("Styles @ <role>").
export async function getStyles(assignedRole?: string): Promise<DbStyle[]> {
  return (await sql.query(
    `SELECT ${STYLE_SELECT} FROM styles s
     LEFT JOIN seasons se ON se.id = s.season_id
     WHERE s.created_by_id IS NOT NULL
       AND ($1::text IS NULL OR s.assigned_role = $1)
     ORDER BY s.created_at DESC`,
    [assignedRole ?? null],
  )) as DbStyle[];
}

export async function getStyleById(id: string): Promise<DbStyle | null> {
  const rows = (await sql.query(
    `SELECT ${STYLE_SELECT} FROM styles s
     LEFT JOIN seasons se ON se.id = s.season_id WHERE s.id = $1 LIMIT 1`,
    [id],
  )) as DbStyle[];
  return rows[0] ?? null;
}

export type StyleInput = {
  seasonId: string | null;
  department: string | null;
  brand: string | null;
  productType: string | null;
  styleType: string | null;
  templateId: string | null;
  templateName: string | null;
  styleName: string;
  matkl: string | null;
  businessUnit: string | null;
};

// Everything editable on the style detail page (the create fields plus the
// "fill later" production fields and status).
export type StyleEditable = StyleInput & {
  status: string;
  pack: string | null;
  dropName: string | null;
  imageUrl: string | null;
  supplierRequest: string | null;
  issueDate: string | null;
  colorCombo: string | null;
  vendors: string | null;
};

// Generate a human-ish unique-ish style code, e.g. "Westside AW26_00007".
async function nextStyleCode(prefixParts: Array<string | null>): Promise<string> {
  const rows = (await sql`SELECT COUNT(*)::int AS n FROM styles`) as Array<{ n: number }>;
  const seq = String((rows[0]?.n ?? 0) + 1).padStart(5, "0");
  const prefix = prefixParts.filter(Boolean).join(" ").trim() || "STY";
  return `${prefix}_${seq}`;
}

export async function createStyle(
  input: StyleInput & { createdBy: string; createdById: string },
): Promise<DbStyle> {
  // Pull template defaults (empty for now) to pre-fill matching empty fields.
  let templateDefaults: Record<string, unknown> = {};
  let generic: string | null = null;
  if (input.templateId) {
    const t = (await sql`SELECT details FROM templates WHERE id = ${input.templateId}`) as Array<{
      details: Record<string, unknown>;
    }>;
    templateDefaults = t[0]?.details ?? {};
  }
  if (input.seasonId) {
    const s = (await sql`SELECT generic FROM seasons WHERE id = ${input.seasonId}`) as Array<{
      generic: string | null;
    }>;
    generic = s[0]?.generic ?? null;
  }
  const pick = (key: string, own: string | null) =>
    own ?? (typeof templateDefaults[key] === "string" ? (templateDefaults[key] as string) : null);

  const styleCode = await nextStyleCode([input.businessUnit ?? input.brand, generic]);

  const rows = (await sql`
    INSERT INTO styles (
      season_id, department, brand, product_type, style_type, template,
      template_id, style_name, style_code, matkl_description_3, business_unit,
      pack, drop_name, image_url, supplier_request, issue_date, color_combo,
      vendors, status, created_by, created_by_id
    ) VALUES (
      ${input.seasonId}, ${input.department}, ${input.brand}, ${input.productType},
      ${input.styleType}, ${input.templateName}, ${input.templateId},
      ${input.styleName}, ${styleCode}, ${input.matkl}, ${input.businessUnit},
      ${pick("pack", null)}, ${pick("drop_name", null)}, ${pick("image_url", null)},
      ${pick("supplier_request", null)}, ${null}, ${pick("color_combo", null)},
      ${pick("vendors", null)}, 'active', ${input.createdBy}, ${input.createdById}
    )
    RETURNING id
  `) as Array<{ id: string }>;
  return (await getStyleById(rows[0].id))!;
}

export async function updateStyle(
  id: string,
  patch: Partial<StyleEditable>,
): Promise<DbStyle | null> {
  const has = (k: string) => Object.prototype.hasOwnProperty.call(patch, k);
  await sql`
    UPDATE styles SET
      season_id = CASE WHEN ${has("seasonId")} THEN ${patch.seasonId ?? null} ELSE season_id END,
      department = CASE WHEN ${has("department")} THEN ${patch.department ?? null} ELSE department END,
      brand = CASE WHEN ${has("brand")} THEN ${patch.brand ?? null} ELSE brand END,
      product_type = CASE WHEN ${has("productType")} THEN ${patch.productType ?? null} ELSE product_type END,
      style_type = CASE WHEN ${has("styleType")} THEN ${patch.styleType ?? null} ELSE style_type END,
      template = CASE WHEN ${has("templateName")} THEN ${patch.templateName ?? null} ELSE template END,
      template_id = CASE WHEN ${has("templateId")} THEN ${patch.templateId ?? null} ELSE template_id END,
      style_name = CASE WHEN ${has("styleName")} THEN ${patch.styleName ?? null} ELSE style_name END,
      matkl_description_3 = CASE WHEN ${has("matkl")} THEN ${patch.matkl ?? null} ELSE matkl_description_3 END,
      business_unit = CASE WHEN ${has("businessUnit")} THEN ${patch.businessUnit ?? null} ELSE business_unit END,
      status = CASE WHEN ${has("status")} THEN ${patch.status ?? "active"} ELSE status END,
      pack = CASE WHEN ${has("pack")} THEN ${patch.pack ?? null} ELSE pack END,
      drop_name = CASE WHEN ${has("dropName")} THEN ${patch.dropName ?? null} ELSE drop_name END,
      image_url = CASE WHEN ${has("imageUrl")} THEN ${patch.imageUrl ?? null} ELSE image_url END,
      supplier_request = CASE WHEN ${has("supplierRequest")} THEN ${patch.supplierRequest ?? null} ELSE supplier_request END,
      issue_date = CASE WHEN ${has("issueDate")} THEN ${patch.issueDate ?? null} ELSE issue_date END,
      color_combo = CASE WHEN ${has("colorCombo")} THEN ${patch.colorCombo ?? null} ELSE color_combo END,
      vendors = CASE WHEN ${has("vendors")} THEN ${patch.vendors ?? null} ELSE vendors END
    WHERE id = ${id}
  `;
  return getStyleById(id);
}

export async function deleteStyle(id: string): Promise<void> {
  await sql`DELETE FROM styles WHERE id = ${id}`;
}

// ── Color combos (child colourways of a style) ──────────────────────────────

export type DbColorCombo = {
  id: string;
  style_id: string;
  name: string;
  combo_code: string | null;
  seq: number;
  colorway_selection: string | null;
  pantone_code: string | null;
  color_palette: string | null;
  colour_family: string | null;
  generic: string | null;
  pack: string | null;
  drop_name: string | null;
  month: string | null;
  image_url: string | null;
  status: string;
  created_by: string | null;
  created_by_id: string | null;
  created_at: string;
};

// Combo joined with its parent style/season context (for the global list + detail).
export type DbColorComboContext = DbColorCombo & {
  style_name: string | null;
  style_code: string | null;
  brand: string | null;
  product_type: string | null;
  season_name: string | null;
};

const COMBO_COLS = `
  id, style_id, name, combo_code, seq, colorway_selection, pantone_code,
  color_palette, colour_family, generic, pack, drop_name, month, image_url,
  status, created_by, created_by_id, created_at
`;

export async function getColorCombos(styleId: string): Promise<DbColorCombo[]> {
  return (await sql.query(
    `SELECT ${COMBO_COLS} FROM color_combos WHERE style_id = $1 ORDER BY seq ASC`,
    [styleId],
  )) as DbColorCombo[];
}

export async function getColorComboById(id: string): Promise<DbColorCombo | null> {
  const rows = (await sql.query(
    `SELECT ${COMBO_COLS} FROM color_combos WHERE id = $1 LIMIT 1`,
    [id],
  )) as DbColorCombo[];
  return rows[0] ?? null;
}

const COMBO_CTX_SELECT = `
  cc.id, cc.style_id, cc.name, cc.combo_code, cc.seq, cc.colorway_selection,
  cc.pantone_code, cc.color_palette, cc.colour_family, cc.generic, cc.pack,
  cc.drop_name, cc.month, cc.image_url, cc.status, cc.created_by,
  cc.created_by_id, cc.created_at,
  s.style_name, s.style_code, s.brand, s.product_type, se.name AS season_name
`;

export async function getColorComboContext(
  id: string,
): Promise<DbColorComboContext | null> {
  const rows = (await sql.query(
    `SELECT ${COMBO_CTX_SELECT} FROM color_combos cc
     JOIN styles s ON s.id = cc.style_id
     LEFT JOIN seasons se ON se.id = s.season_id
     WHERE cc.id = $1 LIMIT 1`,
    [id],
  )) as DbColorComboContext[];
  return rows[0] ?? null;
}

// Global combos list (all styles) with parent context, filter + pagination.
export async function getAllColorCombos(opts: {
  q?: string;
  limit: number;
  offset: number;
}): Promise<{ combos: DbColorComboContext[]; total: number }> {
  const like = opts.q ? `%${opts.q}%` : null;
  const combos = (await sql.query(
    `SELECT ${COMBO_CTX_SELECT} FROM color_combos cc
     JOIN styles s ON s.id = cc.style_id
     LEFT JOIN seasons se ON se.id = s.season_id
     WHERE ($1::text IS NULL OR cc.name ILIKE $1 OR cc.combo_code ILIKE $1
            OR s.style_name ILIKE $1 OR s.style_code ILIKE $1)
     ORDER BY cc.created_at DESC
     LIMIT $2 OFFSET $3`,
    [like, opts.limit, opts.offset],
  )) as DbColorComboContext[];
  const totalRows = (await sql.query(
    `SELECT COUNT(*)::int AS total FROM color_combos cc
     JOIN styles s ON s.id = cc.style_id
     WHERE ($1::text IS NULL OR cc.name ILIKE $1 OR cc.combo_code ILIKE $1
            OR s.style_name ILIKE $1 OR s.style_code ILIKE $1)`,
    [like],
  )) as Array<{ total: number }>;
  return { combos, total: totalRows[0]?.total ?? 0 };
}

export type ColorComboInput = {
  name: string;
  colorwaySelection: string | null;
  pantoneCode: string | null;
  colorPalette: string | null;
  colourFamily: string | null;
  generic: string | null;
  pack: string | null;
  dropName: string | null;
  month: string | null;
  imageUrl: string | null;
  status?: string;
};

export async function createColorCombo(
  styleId: string,
  input: ColorComboInput & { createdBy: string; createdById: string },
): Promise<DbColorCombo> {
  // Sequence + code are per-style: <style_code>_<NNN>.
  const meta = (await sql`
    SELECT s.style_code,
           COALESCE((SELECT MAX(seq) FROM color_combos WHERE style_id = ${styleId}), 0) AS max_seq
    FROM styles s WHERE s.id = ${styleId}
  `) as Array<{ style_code: string | null; max_seq: number }>;
  const seq = Number(meta[0]?.max_seq ?? 0) + 1;
  const base = meta[0]?.style_code ?? "STYLE";
  const comboCode = `${base}_${String(seq).padStart(3, "0")}`;

  const rows = (await sql`
    INSERT INTO color_combos (
      style_id, name, combo_code, seq, colorway_selection, pantone_code,
      color_palette, colour_family, generic, pack, drop_name, month, image_url,
      status, created_by, created_by_id
    ) VALUES (
      ${styleId}, ${input.name}, ${comboCode}, ${seq}, ${input.colorwaySelection},
      ${input.pantoneCode}, ${input.colorPalette}, ${input.colourFamily},
      ${input.generic}, ${input.pack}, ${input.dropName}, ${input.month},
      ${input.imageUrl}, ${input.status ?? "active"}, ${input.createdBy},
      ${input.createdById}
    )
    RETURNING id, style_id, name, combo_code, seq, colorway_selection, pantone_code,
              color_palette, colour_family, generic, pack, drop_name, month,
              image_url, status, created_by, created_by_id, created_at
  `) as DbColorCombo[];
  return rows[0];
}

export async function updateColorCombo(
  id: string,
  patch: Partial<ColorComboInput>,
): Promise<DbColorCombo | null> {
  const has = (k: keyof ColorComboInput) =>
    Object.prototype.hasOwnProperty.call(patch, k);
  await sql`
    UPDATE color_combos SET
      name = CASE WHEN ${has("name")} THEN ${patch.name ?? null} ELSE name END,
      colorway_selection = CASE WHEN ${has("colorwaySelection")} THEN ${patch.colorwaySelection ?? null} ELSE colorway_selection END,
      pantone_code = CASE WHEN ${has("pantoneCode")} THEN ${patch.pantoneCode ?? null} ELSE pantone_code END,
      color_palette = CASE WHEN ${has("colorPalette")} THEN ${patch.colorPalette ?? null} ELSE color_palette END,
      colour_family = CASE WHEN ${has("colourFamily")} THEN ${patch.colourFamily ?? null} ELSE colour_family END,
      generic = CASE WHEN ${has("generic")} THEN ${patch.generic ?? null} ELSE generic END,
      pack = CASE WHEN ${has("pack")} THEN ${patch.pack ?? null} ELSE pack END,
      drop_name = CASE WHEN ${has("dropName")} THEN ${patch.dropName ?? null} ELSE drop_name END,
      month = CASE WHEN ${has("month")} THEN ${patch.month ?? null} ELSE month END,
      image_url = CASE WHEN ${has("imageUrl")} THEN ${patch.imageUrl ?? null} ELSE image_url END,
      status = CASE WHEN ${has("status")} THEN ${patch.status ?? "active"} ELSE status END
    WHERE id = ${id}
  `;
  return getColorComboById(id);
}

export async function deleteColorCombo(id: string): Promise<void> {
  await sql`DELETE FROM color_combos WHERE id = ${id}`;
}

export async function getComboOptions(): Promise<{
  colorwaySelections: string[];
  colorPalettes: string[];
}> {
  const [selections, palettes] = await Promise.all([
    sql`SELECT name FROM colorway_selections WHERE active ORDER BY sort, name`,
    sql`SELECT name FROM color_palettes WHERE active ORDER BY sort, name`,
  ]);
  return {
    colorwaySelections: (selections as Array<{ name: string }>).map((r) => r.name),
    colorPalettes: (palettes as Array<{ name: string }>).map((r) => r.name),
  };
}

export async function getUserByRole(role: Role): Promise<DbUser | null> {
  const rows = (await sql`
    SELECT id, name, email, role FROM users WHERE role = ${role} LIMIT 1
  `) as DbUser[];
  return rows[0] ?? null;
}

export async function getRunByRole(role: Role): Promise<DbRun | null> {
  const rows = (await sql`
    SELECT id, role, season, division, mode, status, state, updated_at
    FROM runs WHERE role = ${role} LIMIT 1
  `) as DbRun[];
  return rows[0] ?? null;
}

// Merge a partial state patch into the role's run and stamp updated_at.
export async function patchRunState(
  role: Role,
  patch: Record<string, unknown>,
): Promise<DbRun | null> {
  const rows = (await sql`
    UPDATE runs
    SET state = state || ${JSON.stringify(patch)}::jsonb,
        mode = COALESCE(${(patch.mode as string) ?? null}, mode),
        updated_at = now()
    WHERE role = ${role}
    RETURNING id, role, season, division, mode, status, state, updated_at
  `) as DbRun[];
  return rows[0] ?? null;
}

export async function getApprovals(runId: string): Promise<DbApproval[]> {
  return (await sql`
    SELECT id, step, seq, status, actor, decided_at
    FROM approvals WHERE run_id = ${runId} ORDER BY seq ASC
  `) as DbApproval[];
}

export async function decideApproval(
  runId: string,
  step: string,
  status: string,
  actor: string,
): Promise<DbApproval | null> {
  const rows = (await sql`
    UPDATE approvals
    SET status = ${status}, actor = ${actor}, decided_at = now()
    WHERE run_id = ${runId} AND step = ${step}
    RETURNING id, step, seq, status, actor, decided_at
  `) as DbApproval[];
  return rows[0] ?? null;
}

export async function addUpload(
  runId: string,
  upload: {
    filename: string;
    size: number;
    rowCount: number;
    readyCount: number;
    raw?: unknown;
  },
) {
  const rows = (await sql`
    INSERT INTO uploads (run_id, filename, size, row_count, ready_count, raw)
    VALUES (${runId}, ${upload.filename}, ${upload.size}, ${upload.rowCount},
            ${upload.readyCount}, ${JSON.stringify(upload.raw ?? null)}::jsonb)
    RETURNING id, filename, size, row_count, ready_count, created_at
  `) as Array<Record<string, unknown>>;
  return rows[0] ?? null;
}

export async function addAudit(
  runId: string | null,
  actor: string,
  action: string,
  detail?: unknown,
) {
  await sql`
    INSERT INTO audit_log (run_id, actor, action, detail)
    VALUES (${runId}, ${actor}, ${action}, ${JSON.stringify(detail ?? null)}::jsonb)
  `;
}

export async function getAudit(runId: string) {
  return (await sql`
    SELECT id, actor, action, detail, at
    FROM audit_log WHERE run_id = ${runId} ORDER BY at DESC LIMIT 200
  `) as Array<Record<string, unknown>>;
}
