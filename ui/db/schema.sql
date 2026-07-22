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

CREATE TABLE IF NOT EXISTS styles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
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
