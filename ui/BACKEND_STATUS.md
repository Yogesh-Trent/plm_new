# PLM Backend — Status (what's done / what's remaining)

Full-stack Next.js 16 app on Neon Postgres. **Backend lives entirely in Next.js
route handlers** (`app/api/**`) + server-only query modules (`lib/**`). The DB URL
and auth secret stay in `ui/.env` (git-ignored) and never reach the client.

- **41 tables**, **49 API route files**, **15 server-only lib modules**, **6 roles**
  (designer, buyer, technologist, all, admin).
- Setup: `npm run db:reset` (migrate + seed) then `npm run dev`.
- Verified continuously per phase: `tsc` + ESLint + `next build` + runtime smoke.

---

## ✅ Done — by phase

### Phase 1 — Foundation & auth
- Neon connection (`lib/db.ts`, `server-only`), idempotent schema (`db/schema.sql`),
  migrate/seed scripts. Signed **httpOnly** session cookie (`lib/auth.ts`, HMAC).
  Edge presence guard (`proxy.ts`). Role-picker login → 5 role dashboards; each
  role has its **own DB-backed run/workspace** (`/api/runs`, `/api/runs/state`).
  Audit log (`audit_log` + `addAudit`). `session`, `approvals`, `uploads`, `audit`.

### Phase 2 — Seasons, Styles, Colour Combos, Admin
- **Seasons** (`/api/seasons`, `/[id]`) — All-only create; creator-only edit/
  delete/status; departments, complete date; live style count.
- **Styles** (`/api/styles`, `/[id]`) — all roles; admin-list selects; auto style
  code; template autofill; MATKL; worklist filter `?assigned=`.
- **Colour Combos** (`/api/color-combos`, `/[id]`, `/styles/[id]/color-combos`) —
  per-style children + **global list** with parent context, search, 20/page
  pagination; per-combo detail (family, generic, pantone, pack, drop, month, image).
- **Admin** (`/api/admin/[list]`, `/[id]`) — CRUD for **17 reference lists**,
  server-enforced admin-only, whitelisted table names (no SQL injection).

### Phase 4 — Bill of Materials
- `/api/boms` (+`/[id]`), `/api/boms/[id]/lines`, `/api/bom-lines/[id]`,
  `/api/color-combos/[id]/boms`. Reusable BOM header + material lines +
  combo↔BOM many-to-many membership ("Add to BOM(s)").

### Phase 5 — Spec / Quality + role assignment
- Generic `style_objects` (`/api/styles/[id]/objects`, `/api/style-objects/[id]`)
  covering **Artwork / Size chart / Spec sheet / Test run** (auto per-kind codes,
  draft↔approved). **Style assignment** (`/api/styles/[id]/assign`) →
  "Styles @ role" worklists. `/api/spec-options`.

### Phase 6 — Sourcing: requests, quotes, costing
- `/api/styles/[id]/supplier-requests`, `/api/supplier-requests/[id]` (+`/quotes`),
  `/api/supplier-quotes/[id]` (+`/material-costs`), `/api/quote-material-costs/[id]`,
  `/api/sourcing-options`. Auto codes, cost-sheet **roll-up** (materials→overhead→
  profit→duties→landed→margin), **Approve** gated to Buyer/Sourcing/All.

### Phase 7 — SKUs, Purchase Orders, multi-role approval
- `/api/styles/[id]/skus` (colour×size **matrix**, idempotent), `/api/skus/[id]`,
  `/api/supplier-pos` (+`/[id]`, `/action`, `/orders`), `/api/po-orders/[id]`,
  `/api/po-options`. PO auto-numbered from season code; derived qtys; full routing
  chain Sourcing→Accounts→Merch→**Issue** (SAP stub)→Close; saved views; actions
  gated to Buyer/Sourcing/All.

### Phase 8 — Sampling & Inspection
- `/api/styles/[id]/samples`, `/api/samples/[id]`,
  `/api/supplier-pos/[id]/inspections`, `/api/inspections/[id]`,
  `/api/sampling-options`. Samples (sealer/type, status pending→approved/rejected);
  Inspections (type/AQL, result pending→pass/fail).

---

## ⛔ Remaining / deferred (documented, not hidden)
- **Size-chart reviews** (seal/vendor/sample nesting) and **BOM care labels** —
  Phase 5 follow-ups on the existing pattern.
- **Duplicate style / combo** (`content_copy` in the sample screens).
- **Brand-scoped colorway selections** (currently global).
- **Costing**: simplified roll-up, not the full Centric duty-formula engine; HSN/
  freight text fields on the sheet.
- **ERP**: SAP article/PO numbers are stubs (no real integration).
- **Real accounts**: login is a role-picker (upgradeable to email+password).
- **Deeper field persistence**: the legacy prototype dashboard's manual fields
  still use localStorage; the real process (Seasons→…→Inspection) is fully DB-backed.
- **Sourcing / Accounts / Merchandiser** are PO approval *stages* performed by
  Buyer/All — not separate login roles.

---

## Test results — 66/66 passing ✅
A 66-check end-to-end suite (`scratchpad/plm_test.sh`) runs against the live server
covering every phase: auth & role redirects, season role/creator gating, admin CRUD
+ 403/404/409, styles, colour combos (+global list), BOM lines & membership, spec/
quality objects + assignment + worklists, sourcing requests/quotes/**cost roll-up**/
approve-gating, SKU matrix (+idempotency), PO routing→issue+SAP + role gating,
sampling & inspection, and cascade-delete / bad-id / audit checks. **All 66 pass.**

### Issue found & fixed during testing
- **Season `generic` was derived only client-side** → seasons created via the API
  directly had an empty generic (and downstream style/PO codes lost the `AW26`
  prefix). **Fixed:** `deriveGeneric()` now runs server-side as a fallback in
  `POST /api/seasons` (`lib/season-input.ts`), so the API matches the UI. Re-tested
  — codes now derive correctly (e.g. PO `AW26-00002`).
- (Two initial "failures" were test-helper artifacts: Neon returns `numeric` columns
  as quoted strings; the cost roll-up itself was always correct — `120` / `166.32`.)

## Cross-cutting guarantees
- **Auth on every route**: unauthenticated → 401.
- **Role enforcement server-side** (not just hidden buttons): admin lists (admin),
  season create (All), season edit (creator), quote approve + PO actions
  (Buyer/Sourcing/All).
- **Validation**: required fields → 400; unknown enums → 400; oversized images →
  413; bad ids → 404; duplicate reference names → 409.
- **Cascade deletes** keep children consistent (combos, BOM lines, SKUs, PO orders,
  samples, inspections, quotes, material costs).

_See `IMPLEMENTATION.md` (Phases 1–4) and `PHASES_5_7.md` (Phases 5–8) for design
detail._
