-- PLM workspace schema (Neon Postgres). Applied by `npm run db:migrate`.
-- Idempotent: safe to run repeatedly.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- One row per role today (role-picker). Ready to hold real accounts later.
CREATE TABLE IF NOT EXISTS users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text UNIQUE NOT NULL,
  role       text NOT NULL CHECK (role IN ('designer','buyer','technologist','all')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Each role owns its own separate run/workspace (confirmed decision #4).
-- `state` is the JSON workspace blob that replaces per-role localStorage.
CREATE TABLE IF NOT EXISTS runs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role       text NOT NULL CHECK (role IN ('designer','buyer','technologist','all')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  season     text,
  division   text,
  mode       text NOT NULL DEFAULT 'automation' CHECK (mode IN ('automation','manual')),
  status     text NOT NULL DEFAULT 'in_progress',
  state      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- One active run per role for now.
CREATE UNIQUE INDEX IF NOT EXISTS runs_role_key ON runs(role);

-- Full PLM process — Step 1: Seasons (Phase 2). `number_of_styles` is NOT stored;
-- it is derived from styles.season_id so it always reflects reality.
CREATE TABLE IF NOT EXISTS seasons (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  generic       text,
  business_unit text,
  image_url     text,
  created_by    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS styles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  season_id   uuid REFERENCES seasons(id) ON DELETE SET NULL,
  season      text,
  department  text,
  brand       text,
  product_type text,
  style_type  text,
  template    text,
  style_name  text,
  description text,
  colour      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
-- Ensure season_id exists on installs created before Step 1 was added.
ALTER TABLE styles ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES seasons(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS styles_season_idx ON styles(season_id);

CREATE TABLE IF NOT EXISTS bom_items (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id    uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  component text,
  category  text,
  material  text,
  colour    text,
  detail    text
);

CREATE TABLE IF NOT EXISTS suppliers (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id    uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  vendor_id text,
  vendor    text,
  cost      numeric,
  mrp       numeric,
  hsn       text,
  vendor_type text
);

CREATE TABLE IF NOT EXISTS sku_ratios (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  size   text NOT NULL,
  qty    integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS approvals (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  step       text NOT NULL,
  seq        integer NOT NULL DEFAULT 0,
  status     text NOT NULL DEFAULT 'waiting',
  actor      text,
  decided_at timestamptz
);

CREATE TABLE IF NOT EXISTS uploads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  filename    text NOT NULL,
  size        integer NOT NULL DEFAULT 0,
  row_count   integer NOT NULL DEFAULT 0,
  ready_count integer NOT NULL DEFAULT 0,
  raw         jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES runs(id) ON DELETE CASCADE,
  actor  text,
  action text NOT NULL,
  detail jsonb,
  at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_run_idx ON audit_log(run_id, at DESC);

-- Selectable departments for the Season form (seeded with common retail units).
CREATE TABLE IF NOT EXISTS departments (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name   text UNIQUE NOT NULL,
  sort   integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
INSERT INTO departments (name, sort) VALUES
  ('Menswear', 10), ('Womenswear', 20), ('Kidswear', 30), ('Ethnicwear', 40),
  ('Footwear', 50), ('Accessories', 60), ('Beauty', 70), ('Home', 80),
  ('Lingerie', 90), ('Activewear', 100), ('Winterwear', 110)
ON CONFLICT (name) DO NOTHING;

-- Extra Season fields (Phase 2 follow-up): department, completion date, status
-- (creator-controlled), and the owning user for creator-only CRUD.
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS season_complete_date timestamptz;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES users(id) ON DELETE SET NULL;

-- ── Step 2: Style Create ───────────────────────────────────────────────────
-- Reference lists for the Style form. These are "admin-managed" (a dedicated
-- Admin role + CRUD comes in a later phase); for now they are seeded so the
-- form works. Departments reuse the table above.
CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, sort integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
INSERT INTO brands (name, sort) VALUES
  ('Westside', 10), ('Zudio', 20), ('Utsa', 30), ('Nuon', 40),
  ('Gia', 50), ('Bombay Paisley', 60), ('WES', 70)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, sort integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
INSERT INTO product_types (name, sort) VALUES
  ('T-Shirt', 10), ('Shirt', 20), ('Trouser', 30), ('Dress', 40),
  ('Kurta', 50), ('Jacket', 60), ('Jewellery', 70), ('Footwear', 80)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS style_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, sort integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
INSERT INTO style_types (name, sort) VALUES
  ('Apparel', 10), ('Accessories', 20), ('Footwear', 30),
  ('Beauty', 40), ('Home', 50)
ON CONFLICT (name) DO NOTHING;

-- A template is a saved bundle of pre-filled defaults (sizes, colours, …). The
-- big template-authoring process is a later phase, so `details` is empty for now
-- and templates are seeded by name only. When a style picks a template, any keys
-- present in `details` pre-fill the matching (empty) style fields on create.
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, details jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true
);
INSERT INTO templates (name, sort) VALUES
  ('Menswear Core', 10), ('Womenswear Fashion', 20), ('Accessories Basic', 30)
ON CONFLICT (name) DO NOTHING;

-- Styles are created by ANY of the 4 roles (not tied to a run), under an active
-- season. Relax the legacy run link and add the process + "sample" columns.
ALTER TABLE styles ALTER COLUMN run_id DROP NOT NULL;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS style_code text;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS business_unit text;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES templates(id) ON DELETE SET NULL;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS pack text;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS drop_name text;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS supplier_request text;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS issue_date timestamptz;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS color_combo text;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS vendors text;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE styles ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES users(id) ON DELETE SET NULL;

-- ── Admin role ──────────────────────────────────────────────────────────────
-- Widen the role check constraints to include 'admin' (owner of reference data).
-- Drop + re-add keeps this idempotent and lets roles evolve.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('designer','buyer','technologist','all','admin'));
ALTER TABLE runs DROP CONSTRAINT IF EXISTS runs_role_check;
ALTER TABLE runs ADD CONSTRAINT runs_role_check
  CHECK (role IN ('designer','buyer','technologist','all','admin'));

-- ── Step 2b: Color Combos (separate sub-process of a style) ─────────────────
ALTER TABLE styles ADD COLUMN IF NOT EXISTS matkl_description_3 text;

-- Admin-managed reference lists for combos. (Colorway Selection is intended to be
-- brand-scoped later; shipped global for now.)
CREATE TABLE IF NOT EXISTS colorway_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, sort integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
INSERT INTO colorway_selections (name, sort) VALUES
  ('Pantone', 10), ('Swatch', 20), ('Lab Dip', 30), ('Yarn Dye', 40)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS color_palettes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, sort integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
INSERT INTO color_palettes (name, sort) VALUES
  ('Core Neutrals', 10), ('Seasonal Brights', 20), ('Pastels', 30),
  ('Earth Tones', 40), ('Monochrome', 50)
ON CONFLICT (name) DO NOTHING;

-- Each colourway of a style. `combo_code` = <style_code>_<NNN> (per-style seq).
CREATE TABLE IF NOT EXISTS color_combos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id           uuid NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  name               text NOT NULL,
  combo_code         text,
  seq                integer NOT NULL DEFAULT 0,
  colorway_selection text,
  pantone_code       text,
  color_palette      text,
  status             text NOT NULL DEFAULT 'active',
  created_by         text,
  created_by_id      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS color_combos_style_idx ON color_combos(style_id, seq);

-- Extra per-combo detail fields (added when viewing a single combo).
ALTER TABLE color_combos ADD COLUMN IF NOT EXISTS colour_family text;
ALTER TABLE color_combos ADD COLUMN IF NOT EXISTS generic text;
ALTER TABLE color_combos ADD COLUMN IF NOT EXISTS pack text;
ALTER TABLE color_combos ADD COLUMN IF NOT EXISTS drop_name text;
ALTER TABLE color_combos ADD COLUMN IF NOT EXISTS month text;
ALTER TABLE color_combos ADD COLUMN IF NOT EXISTS image_url text;

-- ── Phase 4: Bill of Materials (BOM) ───────────────────────────────────────
-- A BOM is a REUSABLE bill of materials (header + material lines). "Add to
-- BOM(s)" attaches a colour combo to one or more BOMs (many-to-many), so the
-- same BOM can be reused across styles/combos when creating supply.
CREATE TABLE IF NOT EXISTS boms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  code          text,
  description   text,
  status        text NOT NULL DEFAULT 'active',
  created_by    text,
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bom_lines (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id     uuid NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
  seq        integer NOT NULL DEFAULT 0,
  component  text,
  category   text,
  material   text,
  colour     text,
  detail     text,
  quantity   numeric,
  uom        text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bom_lines_bom_idx ON bom_lines(bom_id, seq);

-- Many-to-many: a combo can be in many BOMs; a BOM can hold many combos.
CREATE TABLE IF NOT EXISTS bom_combos (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id    uuid NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
  combo_id  uuid NOT NULL REFERENCES color_combos(id) ON DELETE CASCADE,
  added_by  text,
  added_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bom_id, combo_id)
);
CREATE INDEX IF NOT EXISTS bom_combos_combo_idx ON bom_combos(combo_id);

-- ── Phase 5: Style enrichment (Spec / Quality) + role assignment ────────────
-- One generic table for the style child-objects that share a shape (Artwork,
-- Size Chart, Spec Data Sheet, Test Run). `kind` discriminates; `data` holds the
-- kind-specific fields. Keeps one API + one UI for all four.
CREATE TABLE IF NOT EXISTS style_objects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id      uuid NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('artwork','size_chart','spec_sheet','test_run')),
  code          text,
  seq           integer NOT NULL DEFAULT 0,
  name          text,
  description   text,
  phase         text NOT NULL DEFAULT 'Production',
  state         text NOT NULL DEFAULT 'draft',
  data          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by    text,
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  modified_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS style_objects_idx ON style_objects(style_id, kind, seq);

-- Role assignment / worklists (Send To Designer/Buyer/Technologist/Sourcing).
ALTER TABLE styles ADD COLUMN IF NOT EXISTS assigned_role text;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS assignment_comment text;

-- New admin-managed reference lists for Phase 5.
CREATE TABLE IF NOT EXISTS spec_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, sort integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true
);
INSERT INTO spec_types (name, sort) VALUES
  ('Children Safety Risk Assessment', 10), ('Fabric Test Report', 20),
  ('Garment Construction', 30), ('Compliance Checklist', 40)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS size_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, sort integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true
);
INSERT INTO size_ranges (name, sort) VALUES
  ('Womenswear Size Range - Alpha', 10), ('Menswear Size Range', 20),
  ('Kidswear Size Range', 30), ('Footwear Size Range', 40)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS size_chart_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, sort integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true
);
INSERT INTO size_chart_templates (name, sort) VALUES
  ('Womenswear Basic Tee', 10), ('Menswear Shirt', 20), ('Denim Trouser', 30)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS sealers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, sort integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true
);
INSERT INTO sealers (name, sort) VALUES ('Blue Seal', 10), ('Silver Seal', 20)
ON CONFLICT (name) DO NOTHING;

-- ── Phase 6: Sourcing (Supplier Requests → Quotes → Costing) ────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, sort integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true
);
INSERT INTO vendors (name, sort) VALUES
  ('Admin - Trent', 10), ('AASAWARI', 20), ('Maheshwari Enterprises', 30),
  ('NZ Seasonal Wear Private Limited', 40), ('AAGAM Apparels Private Limited', 50),
  ('ABA Fashions Ltd', 60)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS supplier_request_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, sort integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true
);
INSERT INTO supplier_request_templates (name, sort) VALUES
  ('Blue Seal Request Template', 10), ('Silver Seal Request Template', 20)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS data_package_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, sort integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true
);
INSERT INTO data_package_templates (name, sort) VALUES
  ('Sample Tech Pack', 10), ('Full Tech Pack', 20)
ON CONFLICT (name) DO NOTHING;

-- A request raised from a style to a vendor to solicit quotes/samples.
CREATE TABLE IF NOT EXISTS supplier_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id              uuid NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  request_code          text,
  seq                   integer NOT NULL DEFAULT 0,
  requester             text,
  vendor                text,
  request_template      text,
  data_package_template text,
  issue_date            timestamptz,
  state                 text NOT NULL DEFAULT 'draft',
  tech_approval_status  text NOT NULL DEFAULT 'pending',
  created_by            text,
  created_by_id         uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  modified_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supplier_requests_style_idx ON supplier_requests(style_id, seq);

-- A vendor's costed quote against a request. `cost` jsonb holds the full cost
-- sheet; a few summary numbers are promoted to columns for listing/roll-ups.
CREATE TABLE IF NOT EXISTS supplier_quotes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_request_id uuid NOT NULL REFERENCES supplier_requests(id) ON DELETE CASCADE,
  style_id            uuid REFERENCES styles(id) ON DELETE CASCADE,
  quote_code          text,
  seq                 integer NOT NULL DEFAULT 0,
  product_on_sr       text,
  state               text NOT NULL DEFAULT 'draft',
  supplier            text,
  country_of_origin   text,
  currency            text,
  target_price        numeric,
  bom_id              uuid REFERENCES boms(id) ON DELETE SET NULL,
  material_total      numeric DEFAULT 0,
  product_cost        numeric DEFAULT 0,
  mrp                 numeric DEFAULT 0,
  margin_pct          numeric DEFAULT 0,
  colors              text,
  sizes               text,
  selected            boolean NOT NULL DEFAULT false,
  cost                jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by          text,
  created_by_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  modified_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supplier_quotes_request_idx ON supplier_quotes(supplier_request_id, seq);

CREATE TABLE IF NOT EXISTS quote_material_costs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id       uuid NOT NULL REFERENCES supplier_quotes(id) ON DELETE CASCADE,
  seq            integer NOT NULL DEFAULT 0,
  placement_name text,
  main_material  text,
  bom_section    text,
  product        text,
  qty            numeric,
  unit_cost      numeric,
  material_total numeric
);
CREATE INDEX IF NOT EXISTS quote_material_costs_idx ON quote_material_costs(quote_id, seq);

-- ── Phase 7: SKUs, Purchase Orders & multi-role approval ────────────────────
CREATE TABLE IF NOT EXISTS holiday_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, sort integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true
);
INSERT INTO holiday_calendars (name, sort) VALUES
  ('TRENT HOLIDAY 2026', 10), ('TRENT HOLIDAY 2027', 20)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS critical_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, sort integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true
);
INSERT INTO critical_paths (name, sort) VALUES
  ('WCP60', 10), ('WCP90', 20), ('WCP105', 30), ('WCP120', 40)
ON CONFLICT (name) DO NOTHING;

-- One SKU per style × colour combo × size.
CREATE TABLE IF NOT EXISTS style_skus (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id          uuid NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  combo_id          uuid REFERENCES color_combos(id) ON DELETE SET NULL,
  size              text,
  unique_id         text,
  generic           text,
  sap_article_code  text,
  repeat_type       text,
  matkl_group       text,
  style_description  text,
  store_grade       text,
  pack              text,
  strategy          text,
  colour_family     text,
  story_name        text,
  fixture_type      text,
  hsn_code          text,
  supplier_quote_id uuid REFERENCES supplier_quotes(id) ON DELETE SET NULL,
  margin_pct        numeric,
  mrp               numeric,
  created_by        text,
  created_by_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS style_skus_style_idx ON style_skus(style_id);

-- Supplier Purchase Order with routing/approval flags (Sourcing→Accounts→Merch).
CREATE TABLE IF NOT EXISTS supplier_pos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number             text,
  seq                   integer NOT NULL DEFAULT 0,
  style_id              uuid REFERENCES styles(id) ON DELETE SET NULL,
  supplier              text,
  brand                 text,
  category              text,
  country_of_origin     text,
  launch_date           timestamptz,
  ex_factory            timestamptz,
  shipment_date         timestamptz,
  final_inspection_date timestamptz,
  holiday_calendar      text,
  critical_path         text,
  total_order_quantity  numeric DEFAULT 0,
  vendor_capacity       numeric DEFAULT 0,
  validation_status     text DEFAULT 'Ok to proceed',
  mandatory_check       boolean NOT NULL DEFAULT false,
  reason_for_po_delay   text,
  state                 text NOT NULL DEFAULT 'draft',
  -- routing flags
  send_to_sourcing        boolean NOT NULL DEFAULT false,
  send_to_sourcing_date   timestamptz,
  sourcing_approval       boolean NOT NULL DEFAULT false,
  sourcing_approval_date  timestamptz,
  sourcing_approval_user  text,
  submit_to_accounts      boolean NOT NULL DEFAULT false,
  submit_to_accounts_date timestamptz,
  accounts_approved       boolean NOT NULL DEFAULT false,
  accounts_approval_date  timestamptz,
  send_to_merchandiser    boolean NOT NULL DEFAULT false,
  send_to_merchandiser_date timestamptz,
  merchandiser_acceptance boolean NOT NULL DEFAULT false,
  issued_on             timestamptz,
  issued_by             text,
  sap_po_number         text,
  created_by            text,
  created_by_id         uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  modified_at           timestamptz NOT NULL DEFAULT now()
);

-- Split quantities per SKU/size for a PO.
CREATE TABLE IF NOT EXISTS po_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id        uuid NOT NULL REFERENCES supplier_pos(id) ON DELETE CASCADE,
  sku_id       uuid REFERENCES style_skus(id) ON DELETE SET NULL,
  seq          integer NOT NULL DEFAULT 0,
  colour_combo text,
  size         text,
  qty          numeric DEFAULT 0
);
CREATE INDEX IF NOT EXISTS po_orders_po_idx ON po_orders(po_id, seq);

-- ── Phase 8: Sampling & Inspection ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sample_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, sort integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true
);
INSERT INTO sample_types (name, sort) VALUES
  ('Fit Sample', 10), ('PP Sample', 20), ('Size Set', 30), ('TOP Sample', 40),
  ('Salesman Sample', 50)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS inspection_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, sort integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true
);
INSERT INTO inspection_types (name, sort) VALUES
  ('Pre-Production', 10), ('Inline', 20), ('Final', 30), ('AQL', 40)
ON CONFLICT (name) DO NOTHING;

-- Samples generated for a style (optionally from a supplier request).
CREATE TABLE IF NOT EXISTS samples (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id            uuid NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  supplier_request_id uuid REFERENCES supplier_requests(id) ON DELETE SET NULL,
  sample_code         text,
  seq                 integer NOT NULL DEFAULT 0,
  sealer              text,
  sample_type         text,
  vendor              text,
  status              text NOT NULL DEFAULT 'pending',
  sent_date           timestamptz,
  received_date       timestamptz,
  comments            text,
  created_by          text,
  created_by_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS samples_style_idx ON samples(style_id, seq);

-- Inspections against a Supplier PO's shipment.
CREATE TABLE IF NOT EXISTS inspections (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id              uuid NOT NULL REFERENCES supplier_pos(id) ON DELETE CASCADE,
  inspection_code    text,
  seq                integer NOT NULL DEFAULT 0,
  inspection_type    text,
  inspection_date    timestamptz,
  inspector          text,
  quantity_inspected numeric,
  aql                text,
  result             text NOT NULL DEFAULT 'pending',
  comments           text,
  created_by         text,
  created_by_id      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inspections_po_idx ON inspections(po_id, seq);
