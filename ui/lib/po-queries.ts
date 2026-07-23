import "server-only";
import { sql } from "@/lib/db";

// Phase 7 — SKUs, Supplier POs & multi-role approval.

export type DbSku = {
  id: string;
  style_id: string;
  combo_id: string | null;
  size: string | null;
  unique_id: string | null;
  colour_family: string | null;
  store_grade: string | null;
  pack: string | null;
  matkl_group: string | null;
  hsn_code: string | null;
  supplier_quote_id: string | null;
  quote_code: string | null;
  margin_pct: string | null;
  mrp: string | null;
};

export async function getStyleSkus(styleId: string): Promise<DbSku[]> {
  return (await sql`
    SELECT sk.id, sk.style_id, sk.combo_id, sk.size, sk.unique_id, sk.colour_family,
           sk.store_grade, sk.pack, sk.matkl_group, sk.hsn_code, sk.supplier_quote_id,
           q.quote_code, sk.margin_pct, sk.mrp
    FROM style_skus sk
    LEFT JOIN supplier_quotes q ON q.id = sk.supplier_quote_id
    WHERE sk.style_id = ${styleId}
    ORDER BY sk.created_at ASC
  `) as DbSku[];
}

export async function getSkuById(id: string): Promise<DbSku | null> {
  const rows = (await sql`
    SELECT sk.id, sk.style_id, sk.combo_id, sk.size, sk.unique_id, sk.colour_family,
           sk.store_grade, sk.pack, sk.matkl_group, sk.hsn_code, sk.supplier_quote_id,
           q.quote_code, sk.margin_pct, sk.mrp
    FROM style_skus sk
    LEFT JOIN supplier_quotes q ON q.id = sk.supplier_quote_id
    WHERE sk.id = ${id} LIMIT 1
  `) as DbSku[];
  return rows[0] ?? null;
}

// Bulk-create SKUs for every combo × size (skipping any that already exist).
export async function createSkuMatrix(
  styleId: string,
  comboIds: string[],
  sizes: string[],
  by: { createdBy: string; createdById: string },
): Promise<number> {
  const meta = (await sql`SELECT style_code, style_name, matkl_description_3 FROM styles WHERE id = ${styleId}`) as Array<{
    style_code: string | null;
    style_name: string | null;
    matkl_description_3: string | null;
  }>;
  const styleCode = meta[0]?.style_code ?? "STYLE";
  const combos = (await sql`
    SELECT id, name, colour_family FROM color_combos WHERE style_id = ${styleId}
  `) as Array<{ id: string; name: string; colour_family: string | null }>;
  const existing = (await sql`SELECT unique_id FROM style_skus WHERE style_id = ${styleId}`) as Array<{
    unique_id: string | null;
  }>;
  const seen = new Set(existing.map((r) => r.unique_id));

  let created = 0;
  for (const comboId of comboIds) {
    const combo = combos.find((c) => c.id === comboId);
    if (!combo) continue;
    for (const size of sizes) {
      const uniqueId = `${styleCode}-${combo.name}-${size}`;
      if (seen.has(uniqueId)) continue;
      seen.add(uniqueId);
      await sql`
        INSERT INTO style_skus (style_id, combo_id, size, unique_id, colour_family,
          style_description, matkl_group, created_by, created_by_id)
        VALUES (${styleId}, ${comboId}, ${size}, ${uniqueId}, ${combo.colour_family},
          ${meta[0]?.style_name ?? null}, ${meta[0]?.matkl_description_3 ?? null},
          ${by.createdBy}, ${by.createdById})
      `;
      created += 1;
    }
  }
  return created;
}

export async function updateSku(
  id: string,
  patch: Record<string, unknown>,
): Promise<DbSku | null> {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const num = (v: unknown) => (v === "" || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);
  const has = (k: string) => Object.prototype.hasOwnProperty.call(patch, k);
  await sql`
    UPDATE style_skus SET
      store_grade = CASE WHEN ${has("storeGrade")} THEN ${str(patch.storeGrade)} ELSE store_grade END,
      pack = CASE WHEN ${has("pack")} THEN ${str(patch.pack)} ELSE pack END,
      matkl_group = CASE WHEN ${has("matklGroup")} THEN ${str(patch.matklGroup)} ELSE matkl_group END,
      hsn_code = CASE WHEN ${has("hsnCode")} THEN ${str(patch.hsnCode)} ELSE hsn_code END,
      supplier_quote_id = CASE WHEN ${has("supplierQuoteId")} THEN ${str(patch.supplierQuoteId)} ELSE supplier_quote_id END,
      mrp = CASE WHEN ${has("mrp")} THEN ${num(patch.mrp)} ELSE mrp END,
      margin_pct = CASE WHEN ${has("marginPct")} THEN ${num(patch.marginPct)} ELSE margin_pct END
    WHERE id = ${id}
  `;
  return getSkuById(id);
}

export async function deleteSku(id: string): Promise<void> {
  await sql`DELETE FROM style_skus WHERE id = ${id}`;
}

// Approved quotes for this style (to price SKUs).
export async function getStyleApprovedQuotes(
  styleId: string,
): Promise<Array<{ id: string; quote_code: string | null }>> {
  return (await sql`
    SELECT id, quote_code FROM supplier_quotes
    WHERE style_id = ${styleId} AND state = 'approved' ORDER BY seq ASC
  `) as Array<{ id: string; quote_code: string | null }>;
}

// ── Supplier POs ────────────────────────────────────────────────────────────

export type DbPo = {
  id: string;
  po_number: string | null;
  style_id: string | null;
  style_name?: string | null;
  supplier: string | null;
  brand: string | null;
  category: string | null;
  country_of_origin: string | null;
  launch_date: string | null;
  ex_factory: string | null;
  shipment_date: string | null;
  final_inspection_date: string | null;
  holiday_calendar: string | null;
  critical_path: string | null;
  total_order_quantity: string | null;
  vendor_capacity: string | null;
  validation_status: string | null;
  mandatory_check: boolean;
  reason_for_po_delay: string | null;
  state: string;
  send_to_sourcing: boolean;
  sourcing_approval: boolean;
  sourcing_approval_user: string | null;
  submit_to_accounts: boolean;
  accounts_approved: boolean;
  send_to_merchandiser: boolean;
  merchandiser_acceptance: boolean;
  issued_on: string | null;
  issued_by: string | null;
  sap_po_number: string | null;
  total_split_qty?: number;
  quantity_difference?: number;
  remaining_capacity?: number;
};

const PO_COLS = `
  p.id, p.po_number, p.style_id, s.style_name, p.supplier, p.brand, p.category,
  p.country_of_origin, p.launch_date, p.ex_factory, p.shipment_date,
  p.final_inspection_date, p.holiday_calendar, p.critical_path,
  p.total_order_quantity, p.vendor_capacity, p.validation_status, p.mandatory_check,
  p.reason_for_po_delay, p.state, p.send_to_sourcing, p.sourcing_approval,
  p.sourcing_approval_user, p.submit_to_accounts, p.accounts_approved,
  p.send_to_merchandiser, p.merchandiser_acceptance, p.issued_on, p.issued_by,
  p.sap_po_number
`;

// Saved views segment POs by routing stage (screens 34–36).
const VIEW_WHERE: Record<string, string> = {
  all: "TRUE",
  draft: "p.state = 'draft'",
  sourcing: "p.send_to_sourcing AND NOT p.sourcing_approval",
  accounts: "p.submit_to_accounts AND NOT p.accounts_approved",
  merch: "p.send_to_merchandiser AND NOT p.merchandiser_acceptance",
  issued: "p.state = 'issued'",
};

export async function getPos(view = "all"): Promise<DbPo[]> {
  const where = VIEW_WHERE[view] ?? "TRUE";
  return (await sql.query(
    `SELECT ${PO_COLS} FROM supplier_pos p
     LEFT JOIN styles s ON s.id = p.style_id
     WHERE ${where} ORDER BY p.created_at DESC`,
  )) as DbPo[];
}

export async function getPoById(id: string): Promise<DbPo | null> {
  const rows = (await sql.query(
    `SELECT ${PO_COLS} FROM supplier_pos p
     LEFT JOIN styles s ON s.id = p.style_id WHERE p.id = $1 LIMIT 1`,
    [id],
  )) as DbPo[];
  const po = rows[0];
  if (!po) return null;
  const split = (await sql`SELECT COALESCE(SUM(qty),0) AS total FROM po_orders WHERE po_id = ${id}`) as Array<{
    total: string;
  }>;
  const totalSplit = Number(split[0]?.total ?? 0);
  const orderQty = Number(po.total_order_quantity ?? 0);
  const capacity = Number(po.vendor_capacity ?? 0);
  po.total_split_qty = totalSplit;
  po.quantity_difference = orderQty - totalSplit;
  po.remaining_capacity = capacity - orderQty;
  return po;
}

export async function createPo(input: {
  styleId: string | null;
  supplier: string | null;
  launchDate: string | null;
  exFactory: string | null;
  holidayCalendar: string | null;
  criticalPath: string | null;
  totalOrderQuantity: number | null;
  vendorCapacity: number | null;
  createdBy: string;
  createdById: string;
}): Promise<DbPo> {
  const count = (await sql`SELECT COUNT(*)::int AS n FROM supplier_pos`) as Array<{ n: number }>;
  const seq = (count[0]?.n ?? 0) + 1;
  let prefix = "PO";
  let brand: string | null = null;
  let category: string | null = null;
  if (input.styleId) {
    const meta = (await sql`
      SELECT s.brand, s.department, se.generic
      FROM styles s LEFT JOIN seasons se ON se.id = s.season_id WHERE s.id = ${input.styleId}
    `) as Array<{ brand: string | null; department: string | null; generic: string | null }>;
    prefix = meta[0]?.generic ?? "PO";
    brand = meta[0]?.brand ?? null;
    category = meta[0]?.department ?? null;
  }
  const poNumber = `${prefix}-${String(seq).padStart(5, "0")}`;
  const rows = (await sql`
    INSERT INTO supplier_pos (po_number, seq, style_id, supplier, brand, category,
      launch_date, ex_factory, holiday_calendar, critical_path, total_order_quantity,
      vendor_capacity, created_by, created_by_id)
    VALUES (${poNumber}, ${seq}, ${input.styleId}, ${input.supplier}, ${brand}, ${category},
      ${input.launchDate}, ${input.exFactory}, ${input.holidayCalendar}, ${input.criticalPath},
      ${input.totalOrderQuantity ?? 0}, ${input.vendorCapacity ?? 0}, ${input.createdBy}, ${input.createdById})
    RETURNING id
  `) as Array<{ id: string }>;
  return (await getPoById(rows[0].id))!;
}

export async function updatePoProps(
  id: string,
  patch: Record<string, unknown>,
): Promise<DbPo | null> {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const num = (v: unknown) => (v === "" || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);
  const has = (k: string) => Object.prototype.hasOwnProperty.call(patch, k);
  await sql`
    UPDATE supplier_pos SET
      supplier = CASE WHEN ${has("supplier")} THEN ${str(patch.supplier)} ELSE supplier END,
      launch_date = CASE WHEN ${has("launchDate")} THEN ${str(patch.launchDate)} ELSE launch_date END,
      ex_factory = CASE WHEN ${has("exFactory")} THEN ${str(patch.exFactory)} ELSE ex_factory END,
      shipment_date = CASE WHEN ${has("shipmentDate")} THEN ${str(patch.shipmentDate)} ELSE shipment_date END,
      holiday_calendar = CASE WHEN ${has("holidayCalendar")} THEN ${str(patch.holidayCalendar)} ELSE holiday_calendar END,
      critical_path = CASE WHEN ${has("criticalPath")} THEN ${str(patch.criticalPath)} ELSE critical_path END,
      total_order_quantity = CASE WHEN ${has("totalOrderQuantity")} THEN ${num(patch.totalOrderQuantity)} ELSE total_order_quantity END,
      vendor_capacity = CASE WHEN ${has("vendorCapacity")} THEN ${num(patch.vendorCapacity)} ELSE vendor_capacity END,
      reason_for_po_delay = CASE WHEN ${has("reasonForPoDelay")} THEN ${str(patch.reasonForPoDelay)} ELSE reason_for_po_delay END,
      mandatory_check = CASE WHEN ${has("mandatoryCheck")} THEN ${Boolean(patch.mandatoryCheck)} ELSE mandatory_check END,
      modified_at = now()
    WHERE id = ${id}
  `;
  return getPoById(id);
}

export async function deletePo(id: string): Promise<void> {
  await sql`DELETE FROM supplier_pos WHERE id = ${id}`;
}

// Routing / approval steps (each stamps its flag + date; issue advances state).
export type PoAction =
  | "send_to_sourcing"
  | "sourcing_approval"
  | "submit_to_accounts"
  | "accounts_approved"
  | "send_to_merchandiser"
  | "merchandiser_acceptance"
  | "issue"
  | "close";

export async function poAction(
  id: string,
  action: PoAction,
  userName: string,
): Promise<DbPo | null> {
  switch (action) {
    case "send_to_sourcing":
      await sql`UPDATE supplier_pos SET send_to_sourcing = true, send_to_sourcing_date = now(), state = 'negotiation', modified_at = now() WHERE id = ${id}`;
      break;
    case "sourcing_approval":
      await sql`UPDATE supplier_pos SET sourcing_approval = true, sourcing_approval_date = now(), sourcing_approval_user = ${userName}, modified_at = now() WHERE id = ${id}`;
      break;
    case "submit_to_accounts":
      await sql`UPDATE supplier_pos SET submit_to_accounts = true, submit_to_accounts_date = now(), modified_at = now() WHERE id = ${id}`;
      break;
    case "accounts_approved":
      await sql`UPDATE supplier_pos SET accounts_approved = true, accounts_approval_date = now(), modified_at = now() WHERE id = ${id}`;
      break;
    case "send_to_merchandiser":
      await sql`UPDATE supplier_pos SET send_to_merchandiser = true, send_to_merchandiser_date = now(), modified_at = now() WHERE id = ${id}`;
      break;
    case "merchandiser_acceptance":
      await sql`UPDATE supplier_pos SET merchandiser_acceptance = true, state = 'ready', modified_at = now() WHERE id = ${id}`;
      break;
    case "issue":
      await sql`UPDATE supplier_pos SET state = 'issued', issued_on = now(), issued_by = ${userName},
        sap_po_number = COALESCE(sap_po_number, 'SAP-' || substr(id::text, 1, 8)), modified_at = now() WHERE id = ${id}`;
      break;
    case "close":
      await sql`UPDATE supplier_pos SET state = 'closed', modified_at = now() WHERE id = ${id}`;
      break;
  }
  return getPoById(id);
}

// ── PO orders (split quantities) ────────────────────────────────────────────

export type DbPoOrder = {
  id: string;
  seq: number;
  colour_combo: string | null;
  size: string | null;
  qty: string | null;
};

export async function getPoOrders(poId: string): Promise<DbPoOrder[]> {
  return (await sql`
    SELECT id, seq, colour_combo, size, qty FROM po_orders WHERE po_id = ${poId} ORDER BY seq ASC
  `) as DbPoOrder[];
}

export async function createPoOrder(
  poId: string,
  input: { colourCombo: string | null; size: string | null; qty: number | null },
): Promise<DbPoOrder> {
  const maxRows = (await sql`SELECT COALESCE(MAX(seq),0) AS max_seq FROM po_orders WHERE po_id = ${poId}`) as Array<{
    max_seq: number;
  }>;
  const seq = Number(maxRows[0]?.max_seq ?? 0) + 1;
  const rows = (await sql`
    INSERT INTO po_orders (po_id, seq, colour_combo, size, qty)
    VALUES (${poId}, ${seq}, ${input.colourCombo}, ${input.size}, ${input.qty ?? 0})
    RETURNING id, seq, colour_combo, size, qty
  `) as DbPoOrder[];
  return rows[0];
}

export async function getPoOrderPo(orderId: string): Promise<string | null> {
  const rows = (await sql`SELECT po_id FROM po_orders WHERE id = ${orderId}`) as Array<{ po_id: string }>;
  return rows[0]?.po_id ?? null;
}

export async function deletePoOrder(id: string): Promise<void> {
  await sql`DELETE FROM po_orders WHERE id = ${id}`;
}

// Options for PO forms.
export async function getPoOptions(): Promise<{
  vendors: string[];
  holidayCalendars: string[];
  criticalPaths: string[];
  styles: Array<{ id: string; style_name: string | null; style_code: string | null }>;
}> {
  const names = async (table: string) =>
    ((await sql.query(`SELECT name FROM ${table} WHERE active ORDER BY sort, name`)) as Array<{
      name: string;
    }>).map((r) => r.name);
  const [vendors, holidayCalendars, criticalPaths, styleRows] = await Promise.all([
    names("vendors"),
    names("holiday_calendars"),
    names("critical_paths"),
    sql`SELECT id, style_name, style_code FROM styles WHERE created_by_id IS NOT NULL ORDER BY created_at DESC`,
  ]);
  const styles = styleRows as Array<{ id: string; style_name: string | null; style_code: string | null }>;
  return { vendors, holidayCalendars, criticalPaths, styles };
}
