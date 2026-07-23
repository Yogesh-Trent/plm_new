# PLM Workspace — Role-Based Rebuild & Backend Plan

This document is the implementation roadmap for turning the current **client-only
prototype** into a **role-based application with a real Next.js backend** (Neon
Postgres). It is split into **3 phases**. Nothing is coded until this plan is
approved — review the decisions in each phase and correct anything before we
start.

---

## Current state (what we have today)

- A single Next.js app (`ui/`) — effectively one page: [app/page.tsx](app/page.tsx) (~4,500 lines).
- Two dashboards: **Automation** and **Manual**, each with 3 workflow groups / 6 phases:
  1. Style intake → 2. Color & BOM → 3. Supplier commercial → 4. SKU & PO planning → 5. Final review → 6. Approval & issue.
- **No backend.** All state is in browser `localStorage`; exports are client-side JSON downloads. Seed data lives in [app/data/prototype.json](app/data/prototype.json).
- Approval route today: Merchandiser → Sourcing → Accounts → Ready → Issue.

## Target state

- **4 separate dashboards — one per role** (Designer, Buyer, Technologist, All),
  selected at login. **Each role's dashboard is the current full dashboard** (the
  whole Automation + Manual workflow, unchanged). The work is **not divided**
  between roles — every role gets the complete workflow.
- Backed by a **Neon Postgres database** accessed only through **Next.js server
  routes / server actions** (the DB URL is never shipped to the client).

### The 4 roles — how they relate

| Role | Dashboard | Today | Later (other phases) |
|------|-----------|-------|----------------------|
| **Designer** | Full current dashboard | Same as everyone | + designer-specific extras (TBD) |
| **Buyer** | Full current dashboard | Same as everyone | + buyer-specific extras (TBD) |
| **Technologist** | Full current dashboard | Same as everyone | + technologist-specific extras (TBD) |
| **All** | Full current dashboard | Same as everyone | Superset — sees every role's extras |

> **Most role behaviour is identical right now.** A user picks/logs in as one role
> and lands on **their own copy of the full dashboard**, with **their own saved
> workspace** persisted in the DB. The **extra, role-specific functionality** is
> intentionally deferred — it is added in later phases, one role at a time, without
> touching the shared core. "All" is the superset that will eventually see every
> role's extra features.

---

## Phase 1 — Backend + 4 role dashboards (shared core) — ✅ DONE

**Goal:** stand up the Neon database + secure server layer, add a role/login step,
and make **each of the 4 roles land on its own copy of the current full
dashboard** with its own DB-persisted workspace. All 4 dashboards are identical in
behaviour for now — no work is divided, no role-specific extras yet.

> **Status: shipped.** Neon schema migrated + seeded (4 role runs); server-only DB
> layer (`lib/db.ts`, `lib/queries.ts`); API routes under `app/api/*`; signed
> httpOnly session cookie (`lib/auth.ts`) + edge presence guard (`proxy.ts`);
> role-picker login (`/`) → 4 role dashboards (`/designer`, `/buyer`,
> `/technologist`, `/all`) all rendering the shared `app/Dashboard.tsx`, each with
> its own DB-backed workspace + role badge + sign-out. Verified: `tsc`, ESLint,
> `next build` all pass; no `DATABASE_URL`/`AUTH_SECRET` in any client bundle;
> end-to-end auth + role-isolation smoke tests pass. Run `npm run db:reset` to
> (re)create + seed the DB, then `npm run dev`.

### 1a. Backend foundation (Neon + Next.js API)

Stand up the database and a secure server-side data layer, with zero client
exposure of credentials.

1. **Secrets & config**
   - Put `DATABASE_URL` in `ui/.env.local` (git-ignored). Never referenced from a
     `"use client"` file. Add `.env.local` to `.gitignore`; commit a redacted
     `.env.example`.
   - Add `@neondatabase/serverless` (HTTP driver — no connection pool needed on
     serverless) for query access.
2. **Schema** (`db/schema.sql`, applied via a `db:migrate` script):
   - `users` (id, name, email, role, created_at)
   - `roles` — enum/check constraint: `designer | buyer | technologist | all`
   - `runs` (id, season, division, mode `automation|manual`, status, created_by)
   - `styles` (run_id, hierarchy fields, colorway, description)
   - `bom_items` (style_id, component, material, qty, uom)
   - `suppliers` / `quotes` (run_id, vendor, cost, mrp, terms)
   - `sku_ratios` (run_id, size, qty) + reconciliation total
   - `approvals` (run_id, step, role, status, actor, decided_at)
   - `audit_log` (run_id, actor, action, payload jsonb, at)
   - `uploads` (run_id, filename, parsed_row_count, ready_count, raw jsonb)
3. **Seed** the DB from `prototype.json` so today's demo data exists as a real run.
4. **Data-access layer** (`lib/db.ts`, `lib/queries/*`) — typed query helpers,
   server-only (`import "server-only"`).
5. **API routes** (Next.js route handlers under `app/api/*`), all server-side:
   - `GET/POST /api/runs`, `GET /api/runs/:id`
   - `PATCH /api/styles/:id`, `/api/bom`, `/api/suppliers`, `/api/sku-ratios`
   - `POST /api/uploads` (accept parsed intake rows, validate server-side)
   - `POST /api/approvals` (records a decision — enforces role ownership)
   - `GET /api/audit/:runId`
6. **Verification:** `db:migrate` + `db:seed` run clean; each route tested with a
   script; `next build` and TypeScript pass; no `DATABASE_URL` in any client bundle.

### 1b. Role selection + 4 dashboards (shared core)

1. **Login / role selection:** a simple screen to pick or sign in as **Designer /
   Buyer / Technologist / All**. Session stored in a **signed httpOnly cookie**
   (not localStorage) so the server can trust the role. `lib/auth.ts` +
   `middleware.ts` guard pages and `/api/*`.
2. **Routing:** each role gets its **own dashboard route** (e.g. `/designer`,
   `/buyer`, `/technologist`, `/all`) — **all rendering the same current dashboard
   component** (the existing Automation + Manual workflow, unchanged). Four
   dashboards, identical behaviour today.
3. **Per-role workspace:** each role's saved state (run, fields, uploads, progress)
   is persisted in the DB **scoped to that role's user**, so roles don't share or
   overwrite each other's work.
4. **Role badge** in the header showing the active role; a "Switch role" control
   (at least for testing / `All`).

**Deliverable:** 4 role dashboards live, each the full current workflow, each with
its own DB-backed workspace. No role-specific features yet.

---

## Phase 2 — Role-specific functionality (the differences)

**Goal:** now that every role shares the same working dashboard, add the **extra
functionality that only certain roles have** — one role at a time, layered on top
of the shared core without changing it.

- These extras are **TBD and will be specified with you per role** (you said "some
  have extra functionality that will be done in other phases"). Examples we'll slot
  in here once defined: designer-only style/BOM tools, buyer-only quote/PO actions,
  technologist-only size-ratio/QA validations, and `All`-only oversight (seeing and
  acting across every role's extras + audit).
- Implemented behind a small **capability flag per role** (extends `lib/auth.ts`),
  and enforced server-side in the API so extras can't be triggered by the wrong
  role.

**Deliverable:** each role keeps the shared dashboard **plus** its own extra
features; `All` is the superset.

### Phase 2 build log (the real PLM process)

A fifth role, **Admin**, was added to own reference data. Build order so far:

1. **Step 1 — Seasons** (role All) ✅ — create/edit/delete seasons with department,
   complete date, status (creator-controlled); style count derived live.
2. **Step 2 — Style Create** (all roles) ✅ — create styles under an *active*
   season from admin-managed lists (department, brand/division, product type, style
   type, template). Auto style code; template autofill (empty until the template
   builder exists). Season style-count ticks up per style.
3. **Style detail page** (`/styles/[id]`) ✅ — full edit of every field incl. the
   "fill later" production fields (pack, drop, supplier request, issue date, colour
   combo text, vendors) + image.
4. **Admin role + dashboard** (`/admin`) ✅ — CRUD for departments, brands, product
   types, style types, templates. Server-enforced admin-only.

#### Step 2b — Color Combos (a SEPARATE sub-process) — ✅ DONE

A style has **many** colourways ("color combos"), each with its own child code
(`…_A_05180` → `_001`, `_002`). Decision (pro-dev): **do NOT fold colour-combo
fields into Style Create.** Model color combos as **first-class child rows of a
style**, empty on create, added afterwards from the **style detail page**.

- **`color_combos`** table: `style_id` (cascade), **`name` (required)**,
  `colorway_selection`, `pantone_code` (manual), `color_palette`, auto
  `combo_code` = `<style_code>_<NNN>` (per-style sequence), `status`, creator.
- **Colorway Selection** and **Color Palette** become **admin-managed reference
  lists** (like the others). Colorway Selection is intended to be **brand-scoped**
  ("Pantone", "Swatch", … per brand): shipped first as global admin lists, with
  **brand-scoping documented as the next refinement** (needs a brand column + admin
  brand picker + combo-form filter) to avoid blocking the core flow.
- **Add to BOM(s)** is a **stub button** on each combo now; it will attach the combo
  to reusable BOM templates in the **future BOM/supplier phase** (Step 3+).
- Also added: optional **MATKL Description 3** on styles, and a **Color combos**
  count column in the styles list. **Copied From / duplicate-style** noted as a
  follow-up (the `content_copy` action in your sample).

**Where combos live in the UI:** a "Color combos" section on `/styles/[id]` — list
of combos (name, code, colorway selection, pantone, palette, status) with add /
edit / delete and the Add-to-BOM stub.

**Extended (per your detailed spec):** combos gained more fields — **Colour Family,
Generic, Pack, Drop, Month, Image** — plus two new surfaces:
- **Global list** `/color-combos` — every combo across all styles with parent
  context (Season, Brand/Division, Product Type, Style, Style Code), an **Active**
  toggle, **search filter**, **20/page pagination**, and **Add new colour combo**
  (pick a style + name → opens the combo detail).
- **Per-combo detail** `/color-combos/[id]` — view read-only parent context and
  **manually fill every combo field** (family, generic, pantone, pack, drop, month,
  palette, colorway selection, image, status). Combo rows link here from both the
  in-style section and the global list. `content_copy` (duplicate) still a follow-up.

---

> **Phases 5–7** (Spec/Quality, Sourcing/Quotes/Costing, SKUs/PO/Approvals) are
> specced in detail from the Centric PLM screenshots in **[PHASES_5_7.md](PHASES_5_7.md)**.

#### Phase 4 — Bill of Materials (the "Add to BOM(s)" target) — ✅ DONE

A **BOM is a reusable bill of materials** (header + material lines). Because the
same BOM is reused across styles/combos, a colour combo attaches to **many** BOMs
(many-to-many via `bom_combos`) — that is what "Add to BOM(s)" now does for real.

- **Tables:** `boms` (name, auto `code` `BOM-NNNNN`, description, status),
  `bom_lines` (component, category, material, colour, detail, quantity, uom, seq),
  `bom_combos` (join, unique per bom+combo).
- **`/boms`** list (line & combo counts) + **`/boms/[id]`** detail — edit header,
  full CRUD on material lines, and see which colour combos use the BOM.
- **Add to BOM(s)** on the colour-combo detail page (`/color-combos/[id]`): a
  checkbox picker of all BOMs (attach/detach) plus inline "create BOM". The
  in-style combo action and global list link here. Collaborative across all roles.
- **API:** `/api/boms` (+`/[id]`), `/api/boms/[id]/lines`, `/api/bom-lines/[id]`,
  and `/api/color-combos/[id]/boms` (GET memberships, PUT to set them).

---

## Phase 3 — UI review + wire the app to the backend

**Goal:** address the UI review findings and replace `localStorage` with the DB so
work persists per-run and per-role.

1. **UI review pass** (documented findings + fixes): accessibility (button labels,
   focus, reduced-motion — mostly already good), responsive edge cases, consistent
   status semantics, and empty/loading/error states (new, since data is now async).
2. **Replace local state with API calls:**
   - On load, hydrate the workspace from `GET /api/runs/:id` instead of
     `localStorage`.
   - Field edits, uploads, approvals → `PATCH/POST` to the API; optimistic UI with
     server confirmation.
   - Keep JSON export, but source it from the DB record.
3. **Audit trail view** (for `All`): read `/api/audit/:runId`.
4. **Verification:** end-to-end run through all 4 role dashboards; `next build`,
   TypeScript, and ESLint all pass; no secret leakage; production server responds.

**Deliverable:** a persistent, role-based PLM workspace on Neon, backend-in-Next.js.

---

## Open decisions to confirm before Phase 1

1. **Roles** — confirmed as **Designer, Buyer, Technologist, All** (4 separate
   dashboards, each the full current workflow)?
2. **Auth depth** — is a **role-picker/lightweight login** fine for now, or do you
   want real email+password accounts from the start?
3. **localStorage** — fully **replace** with the DB (recommended), or keep it as an
   offline fallback alongside the DB?
4. **Per-role data** — ✅ **CONFIRMED: each role has a fully separate workspace/run.**
   Data is scoped per (user, role); roles never share or overwrite each other's runs.

Once these are confirmed, we start **Phase 1**.
