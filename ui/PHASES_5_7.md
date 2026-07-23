# Phases 5–7 — Style → PO (from the Centric PLM screenshots)

Source: `resources/screenshoot/PLM Process Screenshot_01–37.jpg` (Centric C8 PLM,
Tata Trent / Westside, "Screens for Style Creation to PO"). This plan maps those
screens onto our Next.js + Neon stack, **reusing the patterns already shipped**
(list + detail pages, `status` workflow, admin-managed reference lists, server-
enforced auth, per-style child objects). Written **before** implementation — review
and correct before we build each phase.

## What already exists (Phases 1–4)
Seasons · Styles (+ id detail) · Colour Combos (+ global list + id detail) · BOMs
(header + material lines + combo↔BOM membership) · Admin reference lists · 5 roles
(Designer, Buyer, Technologist, All, Admin).

## The full process order (from the deck)
Season → Style → Colour Combos → **BOM** → **Artwork / Size Chart / Spec / Care /
Quality** → **assign to Technologist/Buyer** → **Supplier Request → Supplier Quote →
Costing** → **SKUs (+ link quote)** → **Supplier PO → Sourcing/Accounts/Merch
approvals → Issue/SAP** → (Sampling & Inspection, later).

The three next chunks:

---

## Phase 5 — Style enrichment (Spec / Quality) + role worklists — ✅ DONE
> Shipped: one generic `style_objects` table (kind = artwork | size_chart |
> spec_sheet | test_run) with auto per-kind codes (ART/SZC/SPC/TST-###) + draft/
> approved state; a config-driven `StyleObjects` UI in a tabbed "Specification &
> quality" section on the style detail; `styles.assigned_role` + a "Send to
> Designer/Buyer/Technologist/Sourcing" control and a "Styles @ <role>" worklist
> filter; new admin lists (spec types, size ranges, size-chart templates, sealers).
> API: `/api/styles/[id]/objects`, `/api/style-objects/[id]`,
> `/api/styles/[id]/assign`, `/api/spec-options`, `/api/styles?assigned=`.
> Deferred (documented): size-chart *reviews* (seal/vendor/sample) and BOM care
> labels — quick follow-ups on the same pattern. Verified: tsc/lint/build + runtime.

Screens 12–24. Everything that finishes a style before it goes to sourcing. These
are all **child objects of a style** sharing one pattern (list under the style +
`status` DRAFT/APPROVED + audit), so we build one reusable pattern and apply it.

### 5.1 Style child objects (new tables, each FK `style_id`, cascade)
- **artworks** — `code` (auto `ART-…`), `description`, `subtype`, `color_combos`
  (text/refs), `phase` (default "Production"), `state` (draft/approved), audit.
  (Screens 12, 18.)
- **size_charts** — `name`, `size_range`, `selected_sizes`, `base_size`, `phase`,
  `state`, `inspection_relevant` (bool). Created from a **size-chart template**
  (admin list `size_chart_templates`, name-only for now). (Screens 15–17.)
- **size_chart_reviews** — child of a size chart: `review_code`, `revision`,
  `state`, `vendor`, `supplier_request`, `sample`, `sealer` (Blue Seal / Silver
  Seal), `status`. (Screen 15.)
- **spec_data_sheets** — `name`, `spec_type` (admin list `spec_types`, e.g.
  "Children Safety Risk Assessment"), `description`, `state`. (Screen 19.)
- **test_runs** (Quality) — `name`, `code`, `description`, `approved_status`,
  `approved_state`, `latest_status`, `latest_state`, `number_of_tests`,
  `product_supplier`. Optional child `tests`. (Screen 22.)
- **care_labels** on a BOM — extend the existing BOM detail with a Care &
  Composition sub-list: `care_label`, `description`, `care_type`, `active`, +
  `translations` (language). (Screen 21.)

### 5.2 Role assignment + worklists (screens 13, 14, 23, 24)
Ties directly into our existing roles.
- Add `styles.assigned_role` (`designer|buyer|technologist|sourcing|null`) +
  `assigned_at`, `assignment_comment`.
- **Style Assignment action** on the style detail: "Send to Designer / Buyer /
  Technologist / Sourcing" → sets `assigned_role`, audit-logged.
- **Worklist view**: each role dashboard (and `/styles?assigned=<role>`) shows
  "Styles @ <role>" — the styles assigned to it. Reuses the styles list with a
  filter. (Sourcing is a worklist filter only; not a login role yet.)

### 5.3 API + UI
- New admin lists: `spec_types`, `size_chart_templates`, `care_types`, `sealers`
  (Blue Seal / Silver Seal), `vendors` (see Phase 6 — introduced here for reviews).
- Reusable route shape per child object: `GET/POST /api/styles/[id]/<obj>`,
  `PATCH/DELETE /api/<obj>/[id]`.
- UI: add tabbed sections to the **style detail page** — Artwork, Size Charts,
  Spec, Quality — each a list + inline add/edit (like the Colour Combos section);
  a Size-Chart detail can hold its reviews. Style Assignment control in the header.
- **Deliverable:** a style can be fully specced (artwork, size charts + reviews,
  spec sheets, tests, care labels) and routed to a role's worklist.

---

## Phase 6 — Sourcing: Supplier Requests, Quotes & Costing — ✅ DONE
> Shipped: `vendors` + `supplier_request_templates` + `data_package_templates`
> admin lists; `supplier_requests` (child of style, auto code, state draft/issued/
> complete + tech approval); `supplier_quotes` (child of request, auto `…-SQ_####`,
> `cost` jsonb cost sheet + **server-side roll-up** material→overhead→profit→duties→
> landed→margin, BOM link, selected); `quote_material_costs` lines. UI: a Sourcing
> section on the style detail, a **supplier-request detail page** (state/tech +
> quotes) and a **supplier-quote detail page** (cost sheet + material costs +
> roll-up sidebar + **Approve** gated to Buyer/Sourcing/All). Verified: tsc/lint/
> build + runtime (roll-up maths, role-gated approve 403/OK). Deferred: full Centric
> duty formulas, HSN/freight text on the sheet, quote revisions.

Screens 25–29. The vendor-facing quotation + costing engine.

### 6.1 Vendors (master) — admin
- **vendors** table (promoted from a name list): `name`, `code`, `country`,
  `currency`, `status`, plus contact fields. Admin-managed (`/admin`).

### 6.2 Supplier Requests (child of style)
- **supplier_requests** — `request_code` (auto), `style_id`, `requester`,
  `vendor_id`, `supplier_request_template` (admin list), `data_package_template`
  (admin list, e.g. "Sample Tech Pack"), `issue_date`, `state`
  (draft/issued/complete), `tech_approval_status` (pending/approved). Overview
  counts (vendors/products/quotes/samples) derived. (Screens 25, 26, 27.)

### 6.3 Supplier Quotes (child of supplier request)
- **supplier_quotes** — `quote_code` (auto `…-SQ_####`), `supplier_request_id`,
  `product_on_sr`, `state` (draft/approved), `supplier` (vendor), `country_of_origin`,
  `target_price`, `bom_id` (links a BOM), `material_total`, `colors`, `sizes`,
  `selected` (bool), `account_table`, `currency_table`, `supplier_currency`,
  `exc_rate`, `revision`. (Screens 27, 28, 29.)
- **cost sheet** fields on the quote (screen 29, "Open Cost Sheet Overseas"):
  raw_material_total, trim_total, packaging_total, services_total, cmp,
  material_total, fob, overhead_pct/value, profit_margin_pct/value, product_cost,
  product_cost_inr, forwarding_pct/value, bed_pct/value, cvd_pct/value,
  sad_pct/value, zswc_pct/value, option_cost, option_margin, margin_pct, mrp,
  hsn_code, article_freight_group. **Kept as editable numeric fields with simple
  server-side roll-ups** (material+overhead → product cost → +duties → landed);
  the full Centric formula engine is out of scope, documented as such.
- **cost_scenario / material_costs** (screen 28) — child lines of a quote:
  `placement_name`, `main_material`, `bom_section`, `product`, `qty`, `unit_cost`,
  `material_total`. Can seed from the linked BOM's lines.

### 6.4 API + UI
- `/api/supplier-requests` (+ `[id]`), `/api/styles/[id]/supplier-requests`,
  `/api/supplier-quotes` (+ `[id]`, `+/cost`, `+/material-costs`).
- UI: a **Sourcing** section on the style detail (Supplier Requests + their
  Quotes), plus a **Supplier Quote detail page** with the cost sheet + material
  costs grid and an **Approve** action (Buyer/Sourcing owns it — server-enforced).
- **Deliverable:** raise a request to a vendor → generate/enter quotes → cost them
  → approve, producing a priced, BOM-linked quote ready for SKUs/PO.

---

## Phase 7 — SKUs, Purchase Orders & multi-role approval — ✅ DONE
> Shipped: `holiday_calendars` + `critical_paths` admin lists; `style_skus`
> (colour×size **matrix generator**, idempotent, auto `unique_id`, editable
> store-grade/pack/MRP + **approved-quote link** for pricing) on the style detail;
> `supplier_pos` with auto number from season code, editable properties, **derived
> qtys** (split total, difference, remaining capacity), and the full **routing/
> approval chain** (Send-to-Sourcing → Sourcing approval → Submit-to-Accounts →
> Accounts approved → Send-to-Merchandiser → Merchandiser acceptance → **Issue**
> [SAP stub] → Close); `po_orders` split lines. A **`/purchase-orders`** list with
> saved views (All/Draft/Pushed-to-Sourcing/Accounts/Merch/Issued) + a PO detail
> page. PO actions gated to Buyer/Sourcing/All (those approval *stages* are not
> separate login roles in this build). Verified: tsc/lint/build + runtime (matrix,
> derived qtys, full chain to issued+SAP, role 403). Deferred: "Fetch PO Order Qty
> Ratio", SAP integration, Sampling & Inspection (future Phase 8).

Screens 30–36. Commercialization: SKU matrix, price linkage, PO issuance.

### 7.1 Style SKUs (child of style)
- **style_skus** — one row per **style × colour combo × size**: `unique_id`
  (auto), `style_id`, `combo_id`, `size`, `generic`, `sap_article_code`,
  `repeat_type`, `matkl_group`, `style_description`, `store_grade`, `pack`,
  `strategy`, `colour_family`, `story_name`, `fixture_type`, `hsn_code`,
  `supplier_quote_id` (link → price), `margin_pct`, `mrp`. (Screens 30, 31.)
- **Matrix generator**: pick sizes × colour combos (checkboxes) → bulk-create SKUs
  (screen 30 "Use Matrix"). "Fetch PO Order Qty Ratio" deferred.

### 7.2 Supplier PO
- **supplier_pos** — `po_number` (auto `<SEASONCODE>-#####`), `supplier` (vendor),
  `brand`, `category`, `country_of_origin`, `launch_date`, `ex_factory`,
  `shipment_date`, `holiday_calendar` (admin list), `critical_path` (admin list,
  WCP…), `total_order_quantity`, `total_split_qty`, `quantity_difference` (derived),
  `vendor_capacity`, `remaining_capacity`, `validation_status`, `mandatory_check`,
  `products` (style link), `sap_po_number`, `final_inspection_date`,
  `state` (draft/negotiation/ready/issued/closed), audit. (Screens 32, 33.)
- **po_orders** — split-quantity lines per SKU/size (screen 33 "Orders").
- **Routing flags** (screen 33): send_to_sourcing + date + approval/user/rejected;
  submit_to_accounts + date + approved + approval date; send_to_merchandiser +
  date + acceptance; issued_on/by; reason_for_po_delay.

### 7.3 Approvals (screens 34–36)
- **Role-segmented worklists** via saved filters: "PO's Pushed to Sourcing /
  Accounts / Merchandisers", "PO's Issued by Merchandisers". Each approving role
  (Sourcing, Accounts, Merchandiser) sees its queue and can **approve** (single +
  mass). Server-enforces which role may set which flag.
- PO state machine: DRAFT → NEGOTIATION → READY → ISSUED → CLOSED, gated by the
  three approvals; ISSUED sets `sap_po_number` (stub) + `issued_on/by`.

### 7.4 API + UI
- `/api/styles/[id]/skus` (+ matrix create), `/api/skus/[id]`;
  `/api/supplier-pos` (+ `[id]`, `+/approve`), `/api/supplier-pos/[id]/orders`.
- UI: **SKUs** section on the style detail (matrix create + grid + quote link); a
  **`/purchase-orders`** list with role-filtered views + a **PO detail page**
  (properties, routing flags, orders, approve buttons).
- **Deliverable:** generate SKUs → link approved quote → raise a PO → route through
  Sourcing/Accounts/Merchandiser → issue (SAP stub). Sampling & Inspection (screen
  37) becomes a future Phase 8.

---

## Cross-cutting conventions (reused everywhere)
- **State machine** column on every object (`draft`/`issued`/`approved`/…),
  surfaced as the status pill we already use.
- **Audit** via the existing `audit_log` (`addAudit`).
- **Reference data** stays admin-managed (new lists added per phase).
- **Auth**: read = any signed-in role; mutations that represent an approval/route
  are **server-enforced to the owning role**.
- **Simplifications (documented, not hidden):** costing roll-ups are basic (no full
  Centric formula engine); SAP article/PO codes are stubs; revisions are single-
  level; "Sampling & Inspection" is deferred to Phase 8.

## Build order
Phase 5 first (it feeds Phase 6 via size-chart reviews/vendors), then 6 (quotes/
costing feed SKUs), then 7 (SKUs + PO). Each phase ships list + detail + API +
verification (tsc, lint, build, runtime smoke) exactly like Phases 1–4.

---

## Phase 8 — Sampling & Inspection — ✅ DONE
> Shipped: `sample_types` + `inspection_types` admin lists; `samples` (style child,
> auto `SMP-###`, sealer + sample type + vendor, status pending→submitted→approved/
> rejected with auto received-date) in a **Sampling** section on the style detail;
> `inspections` (PO child, auto `INS-###`, type/date/inspector/qty/AQL, result
> pending→pass/fail) in an **Inspections** section on the PO detail. API:
> `/api/styles/[id]/samples` + `/api/samples/[id]`;
> `/api/supplier-pos/[id]/inspections` + `/api/inspections/[id]`;
> `/api/sampling-options`. Verified: tsc/lint/build + runtime (auto codes, required-
> field 400s, status/result transitions, invalid-result 400).

Screenshot 37 (section divider) + references on screens 15 (size-chart reviews →
Sample/Sealer/Status), 26 (supplier request → "Samples to be Generated"), and 33
(PO → Final Inspection Date / Inspections). Two child objects close the loop:

### 8.1 Samples (child of a style; optionally from a supplier request)
- **samples** — `sample_code` (auto `SMP-###`), `style_id` (cascade),
  `supplier_request_id` (nullable), `sealer` (admin list: Blue Seal / Silver
  Seal), `sample_type` (admin list: Fit / PP / Size Set / TOP / Salesman),
  `vendor`, `status` (pending → submitted → approved / rejected), `sent_date`,
  `received_date`, `comments`, audit.
- UI: a **Sampling** section on the style detail (create + table + status toggle +
  delete), same pattern as Sourcing/Colour-combos.

### 8.2 Inspections (child of a Supplier PO)
- **inspections** — `inspection_code` (auto `INS-###`), `po_id` (cascade),
  `inspection_type` (admin list: Pre-Production / Inline / Final / AQL),
  `inspection_date`, `inspector`, `quantity_inspected`, `aql`, `result`
  (pending → pass / fail), `comments`, audit.
- UI: an **Inspections** section on the PO detail page (create + table + result
  toggle + delete); complements the PO's existing `final_inspection_date`.

### 8.3 Admin + API
- New admin lists: `sample_types`, `inspection_types` (Blue/Silver seal reuse the
  existing `sealers` list).
- API: `/api/styles/[id]/samples` + `/api/samples/[id]`;
  `/api/supplier-pos/[id]/inspections` + `/api/inspections/[id]`;
  `/api/sampling-options`.
- **Deliverable:** a style's samples can be sealed/approved and a PO's shipment can
  be inspected pass/fail — the end of the Style→PO→delivery lifecycle.

**Status: implementing now.**
