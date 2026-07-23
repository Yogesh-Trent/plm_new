import "server-only";
import { sql } from "@/lib/db";

// Phase 6 — Sourcing: Supplier Requests → Supplier Quotes → Costing.

export type DbSupplierRequest = {
  id: string;
  style_id: string;
  request_code: string | null;
  seq: number;
  requester: string | null;
  vendor: string | null;
  request_template: string | null;
  data_package_template: string | null;
  issue_date: string | null;
  state: string;
  tech_approval_status: string;
  created_by: string | null;
  created_at: string;
  quote_count?: number;
};

export type DbSupplierRequestListItem = DbSupplierRequest & {
  style_name: string | null;
  style_code: string | null;
};

export type DbSupplierQuote = {
  id: string;
  supplier_request_id: string;
  style_id: string | null;
  quote_code: string | null;
  seq: number;
  product_on_sr: string | null;
  state: string;
  supplier: string | null;
  country_of_origin: string | null;
  currency: string | null;
  target_price: string | null;
  bom_id: string | null;
  material_total: string | null;
  product_cost: string | null;
  mrp: string | null;
  margin_pct: string | null;
  colors: string | null;
  sizes: string | null;
  selected: boolean;
  cost: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

export type DbSupplierQuoteListItem = DbSupplierQuote & {
  request_code: string | null;
  style_name: string | null;
  style_code: string | null;
};

export type DbMaterialCost = {
  id: string;
  quote_id: string;
  seq: number;
  placement_name: string | null;
  main_material: string | null;
  bom_section: string | null;
  product: string | null;
  qty: string | null;
  unit_cost: string | null;
  material_total: string | null;
};

// ── Supplier Requests ───────────────────────────────────────────────────────

export async function getSupplierRequests(
  styleId: string,
): Promise<DbSupplierRequest[]> {
  return (await sql`
    SELECT sr.id, sr.style_id, sr.request_code, sr.seq, sr.requester, sr.vendor,
           sr.request_template, sr.data_package_template, sr.issue_date, sr.state,
           sr.tech_approval_status, sr.created_by, sr.created_at,
           (SELECT COUNT(*)::int FROM supplier_quotes q WHERE q.supplier_request_id = sr.id) AS quote_count
    FROM supplier_requests sr WHERE sr.style_id = ${styleId} ORDER BY sr.seq ASC
  `) as DbSupplierRequest[];
}

export async function getAllSupplierRequests(): Promise<
  DbSupplierRequestListItem[]
> {
  return (await sql`
    SELECT sr.id, sr.style_id, sr.request_code, sr.seq, sr.requester, sr.vendor,
           sr.request_template, sr.data_package_template, sr.issue_date, sr.state,
           sr.tech_approval_status, sr.created_by, sr.created_at,
           s.style_name, s.style_code,
           (SELECT COUNT(*)::int FROM supplier_quotes q WHERE q.supplier_request_id = sr.id) AS quote_count
    FROM supplier_requests sr
    JOIN styles s ON s.id = sr.style_id
    ORDER BY sr.created_at DESC
  `) as DbSupplierRequestListItem[];
}

export async function getSupplierRequestById(
  id: string,
): Promise<DbSupplierRequest | null> {
  const rows = (await sql`
    SELECT id, style_id, request_code, seq, requester, vendor, request_template,
           data_package_template, issue_date, state, tech_approval_status,
           created_by, created_at
    FROM supplier_requests WHERE id = ${id} LIMIT 1
  `) as DbSupplierRequest[];
  return rows[0] ?? null;
}

export type SupplierRequestInput = {
  requester: string | null;
  vendor: string | null;
  requestTemplate: string | null;
  dataPackageTemplate: string | null;
  issueDate: string | null;
};

export async function createSupplierRequest(
  styleId: string,
  input: SupplierRequestInput & { createdBy: string; createdById: string },
): Promise<DbSupplierRequest> {
  const meta = (await sql`
    SELECT s.style_code,
           COALESCE((SELECT MAX(seq) FROM supplier_requests WHERE style_id = ${styleId}), 0) AS max_seq
    FROM styles s WHERE s.id = ${styleId}
  `) as Array<{ style_code: string | null; max_seq: number }>;
  const seq = Number(meta[0]?.max_seq ?? 0) + 1;
  const base = meta[0]?.style_code ?? "SR";
  const code = `${base}_${String(seq).padStart(3, "0")}`;
  const rows = (await sql`
    INSERT INTO supplier_requests (style_id, request_code, seq, requester, vendor,
      request_template, data_package_template, issue_date, created_by, created_by_id)
    VALUES (${styleId}, ${code}, ${seq}, ${input.requester}, ${input.vendor},
      ${input.requestTemplate}, ${input.dataPackageTemplate}, ${input.issueDate},
      ${input.createdBy}, ${input.createdById})
    RETURNING id, style_id, request_code, seq, requester, vendor, request_template,
      data_package_template, issue_date, state, tech_approval_status, created_by, created_at
  `) as DbSupplierRequest[];
  return rows[0];
}

export async function updateSupplierRequest(
  id: string,
  patch: Partial<
    SupplierRequestInput & { state: string; techApprovalStatus: string }
  >,
): Promise<DbSupplierRequest | null> {
  const has = (k: string) => Object.prototype.hasOwnProperty.call(patch, k);
  await sql`
    UPDATE supplier_requests SET
      requester = CASE WHEN ${has("requester")} THEN ${patch.requester ?? null} ELSE requester END,
      vendor = CASE WHEN ${has("vendor")} THEN ${patch.vendor ?? null} ELSE vendor END,
      request_template = CASE WHEN ${has("requestTemplate")} THEN ${patch.requestTemplate ?? null} ELSE request_template END,
      data_package_template = CASE WHEN ${has("dataPackageTemplate")} THEN ${patch.dataPackageTemplate ?? null} ELSE data_package_template END,
      issue_date = CASE WHEN ${has("issueDate")} THEN ${patch.issueDate ?? null} ELSE issue_date END,
      state = CASE WHEN ${has("state")} THEN ${patch.state ?? "draft"} ELSE state END,
      tech_approval_status = CASE WHEN ${has("techApprovalStatus")} THEN ${patch.techApprovalStatus ?? "pending"} ELSE tech_approval_status END,
      modified_at = now()
    WHERE id = ${id}
  `;
  return getSupplierRequestById(id);
}

export async function deleteSupplierRequest(id: string): Promise<void> {
  await sql`DELETE FROM supplier_requests WHERE id = ${id}`;
}

// ── Supplier Quotes ─────────────────────────────────────────────────────────

export async function getSupplierQuotes(
  requestId: string,
): Promise<DbSupplierQuote[]> {
  return (await sql`
    SELECT id, supplier_request_id, style_id, quote_code, seq, product_on_sr, state,
           supplier, country_of_origin, currency, target_price, bom_id, material_total,
           product_cost, mrp, margin_pct, colors, sizes, selected, cost, created_by, created_at
    FROM supplier_quotes WHERE supplier_request_id = ${requestId} ORDER BY seq ASC
  `) as DbSupplierQuote[];
}

export async function getAllSupplierQuotes(): Promise<
  DbSupplierQuoteListItem[]
> {
  return (await sql`
    SELECT q.id, q.supplier_request_id, q.style_id, q.quote_code, q.seq,
           q.product_on_sr, q.state, q.supplier, q.country_of_origin, q.currency,
           q.target_price, q.bom_id, q.material_total, q.product_cost, q.mrp,
           q.margin_pct, q.colors, q.sizes, q.selected, q.cost, q.created_by,
           q.created_at, sr.request_code, s.style_name, s.style_code
    FROM supplier_quotes q
    JOIN supplier_requests sr ON sr.id = q.supplier_request_id
    LEFT JOIN styles s ON s.id = q.style_id
    ORDER BY q.created_at DESC
  `) as DbSupplierQuoteListItem[];
}

export async function getSupplierQuoteById(
  id: string,
): Promise<DbSupplierQuote | null> {
  const rows = (await sql`
    SELECT id, supplier_request_id, style_id, quote_code, seq, product_on_sr, state,
           supplier, country_of_origin, currency, target_price, bom_id, material_total,
           product_cost, mrp, margin_pct, colors, sizes, selected, cost, created_by, created_at
    FROM supplier_quotes WHERE id = ${id} LIMIT 1
  `) as DbSupplierQuote[];
  return rows[0] ?? null;
}

export async function createSupplierQuote(
  requestId: string,
  input: {
    supplier: string | null;
    countryOfOrigin: string | null;
    currency: string | null;
    colors: string | null;
    sizes: string | null;
    createdBy: string;
    createdById: string;
  },
): Promise<DbSupplierQuote> {
  const meta = (await sql`
    SELECT sr.style_id, s.style_code,
           COALESCE((SELECT MAX(seq) FROM supplier_quotes WHERE supplier_request_id = ${requestId}), 0) AS max_seq
    FROM supplier_requests sr JOIN styles s ON s.id = sr.style_id
    WHERE sr.id = ${requestId}
  `) as Array<{ style_id: string; style_code: string | null; max_seq: number }>;
  const seq = Number(meta[0]?.max_seq ?? 0) + 1;
  const code = `${meta[0]?.style_code ?? "SQ"}-SQ_${String(seq).padStart(4, "0")}`;
  const rows = (await sql`
    INSERT INTO supplier_quotes (supplier_request_id, style_id, quote_code, seq,
      supplier, country_of_origin, currency, colors, sizes, created_by, created_by_id)
    VALUES (${requestId}, ${meta[0]?.style_id ?? null}, ${code}, ${seq}, ${input.supplier},
      ${input.countryOfOrigin}, ${input.currency}, ${input.colors}, ${input.sizes},
      ${input.createdBy}, ${input.createdById})
    RETURNING id, supplier_request_id, style_id, quote_code, seq, product_on_sr, state,
      supplier, country_of_origin, currency, target_price, bom_id, material_total,
      product_cost, mrp, margin_pct, colors, sizes, selected, cost, created_by, created_at
  `) as DbSupplierQuote[];
  return rows[0];
}

// Simple, transparent cost roll-up (NOT the full Centric engine — see PHASES_5_7).
function rollUp(cost: Record<string, number>) {
  const n = (k: string) => Number(cost[k] ?? 0) || 0;
  const materialTotal =
    n("raw_material_total") +
    n("trim_total") +
    n("packaging_total") +
    n("services_total");
  const overheadValue = (materialTotal * n("overhead_pct")) / 100;
  const base = materialTotal + overheadValue + n("cmp");
  const profitValue = (base * n("profit_margin_pct")) / 100;
  const productCost = base + profitValue;
  const duties =
    ((n("bed_pct") + n("cvd_pct") + n("sad_pct") + n("zswc_pct")) *
      productCost) /
    100;
  const landed = productCost + duties;
  const margin = n("mrp") > 0 ? ((n("mrp") - landed) / n("mrp")) * 100 : 0;
  return { materialTotal, overheadValue, productCost, landed, margin };
}

export async function updateSupplierQuote(
  id: string,
  patch: {
    supplier?: string | null;
    countryOfOrigin?: string | null;
    currency?: string | null;
    colors?: string | null;
    sizes?: string | null;
    targetPrice?: number | null;
    bomId?: string | null;
    selected?: boolean;
    state?: string;
    cost?: Record<string, number>;
  },
): Promise<DbSupplierQuote | null> {
  const has = (k: string) => Object.prototype.hasOwnProperty.call(patch, k);
  let derived = { materialTotal: 0, productCost: 0, landed: 0, margin: 0 };
  if (has("cost")) derived = rollUp(patch.cost ?? {});
  await sql`
    UPDATE supplier_quotes SET
      supplier = CASE WHEN ${has("supplier")} THEN ${patch.supplier ?? null} ELSE supplier END,
      country_of_origin = CASE WHEN ${has("countryOfOrigin")} THEN ${patch.countryOfOrigin ?? null} ELSE country_of_origin END,
      currency = CASE WHEN ${has("currency")} THEN ${patch.currency ?? null} ELSE currency END,
      colors = CASE WHEN ${has("colors")} THEN ${patch.colors ?? null} ELSE colors END,
      sizes = CASE WHEN ${has("sizes")} THEN ${patch.sizes ?? null} ELSE sizes END,
      target_price = CASE WHEN ${has("targetPrice")} THEN ${patch.targetPrice ?? null} ELSE target_price END,
      bom_id = CASE WHEN ${has("bomId")} THEN ${patch.bomId ?? null} ELSE bom_id END,
      selected = CASE WHEN ${has("selected")} THEN ${patch.selected ?? false} ELSE selected END,
      state = CASE WHEN ${has("state")} THEN ${patch.state ?? "draft"} ELSE state END,
      cost = CASE WHEN ${has("cost")} THEN ${JSON.stringify(patch.cost ?? {})}::jsonb ELSE cost END,
      material_total = CASE WHEN ${has("cost")} THEN ${derived.materialTotal} ELSE material_total END,
      product_cost = CASE WHEN ${has("cost")} THEN ${derived.landed} ELSE product_cost END,
      margin_pct = CASE WHEN ${has("cost")} THEN ${derived.margin} ELSE margin_pct END,
      mrp = CASE WHEN ${has("cost")} THEN ${Number((patch.cost ?? {}).mrp ?? 0) || 0} ELSE mrp END,
      modified_at = now()
    WHERE id = ${id}
  `;
  return getSupplierQuoteById(id);
}

export async function deleteSupplierQuote(id: string): Promise<void> {
  await sql`DELETE FROM supplier_quotes WHERE id = ${id}`;
}

// ── Material costs (child of a quote) ───────────────────────────────────────

export async function getMaterialCosts(
  quoteId: string,
): Promise<DbMaterialCost[]> {
  return (await sql`
    SELECT id, quote_id, seq, placement_name, main_material, bom_section, product,
           qty, unit_cost, material_total
    FROM quote_material_costs WHERE quote_id = ${quoteId} ORDER BY seq ASC
  `) as DbMaterialCost[];
}

export type MaterialCostInput = {
  placementName: string | null;
  mainMaterial: string | null;
  bomSection: string | null;
  product: string | null;
  qty: number | null;
  unitCost: number | null;
};

export async function createMaterialCost(
  quoteId: string,
  input: MaterialCostInput,
): Promise<DbMaterialCost> {
  const maxRows = (await sql`
    SELECT COALESCE(MAX(seq), 0) AS max_seq FROM quote_material_costs WHERE quote_id = ${quoteId}
  `) as Array<{ max_seq: number }>;
  const seq = Number(maxRows[0]?.max_seq ?? 0) + 1;
  const total = (input.qty ?? 0) * (input.unitCost ?? 0);
  const rows = (await sql`
    INSERT INTO quote_material_costs (quote_id, seq, placement_name, main_material,
      bom_section, product, qty, unit_cost, material_total)
    VALUES (${quoteId}, ${seq}, ${input.placementName}, ${input.mainMaterial},
      ${input.bomSection}, ${input.product}, ${input.qty}, ${input.unitCost}, ${total})
    RETURNING id, quote_id, seq, placement_name, main_material, bom_section, product,
      qty, unit_cost, material_total
  `) as DbMaterialCost[];
  return rows[0];
}

export async function deleteMaterialCost(
  id: string,
): Promise<{ quote_id: string } | null> {
  const rows = (await sql`
    DELETE FROM quote_material_costs WHERE id = ${id} RETURNING quote_id
  `) as Array<{ quote_id: string }>;
  return rows[0] ?? null;
}

export async function getMaterialCostById(
  id: string,
): Promise<DbMaterialCost | null> {
  const rows = (await sql`
    SELECT id, quote_id, seq, placement_name, main_material, bom_section, product,
           qty, unit_cost, material_total
    FROM quote_material_costs WHERE id = ${id} LIMIT 1
  `) as DbMaterialCost[];
  return rows[0] ?? null;
}

// Reference lists for the sourcing forms.
export async function getSourcingOptions(): Promise<{
  vendors: string[];
  requestTemplates: string[];
  dataPackageTemplates: string[];
  boms: Array<{ id: string; name: string; code: string | null }>;
}> {
  const names = async (table: string) =>
    (
      (await sql.query(
        `SELECT name FROM ${table} WHERE active ORDER BY sort, name`,
      )) as Array<{
        name: string;
      }>
    ).map((r) => r.name);
  const [vendors, requestTemplates, dataPackageTemplates, bomRows] =
    await Promise.all([
      names("vendors"),
      names("supplier_request_templates"),
      names("data_package_templates"),
      sql`SELECT id, name, code FROM boms WHERE status = 'active' ORDER BY created_at DESC`,
    ]);
  const boms = bomRows as Array<{
    id: string;
    name: string;
    code: string | null;
  }>;
  return { vendors, requestTemplates, dataPackageTemplates, boms };
}
