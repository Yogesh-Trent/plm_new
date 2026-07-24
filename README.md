# Threadline PLM

A role-aware fashion **Product Lifecycle Management** workspace — moves a collection
from concept to a committed, issued purchase order. Built with **Next.js 16 +
React 19** on **Neon Postgres**, it covers seasons, styles, colourways, BOMs,
spec/quality, supplier requests & quotes, SKUs, purchase orders, sampling,
inspections, approvals, and a full audit trail.

The application code lives in [`ui/`](ui/). This README is the map; the deep
detail lives in the docs listed at the bottom.

---

## 1. Quick start

```bash
cd ui
cp .env.example .env          # set DATABASE_URL + AUTH_SECRET
npm install
npm run db:reset              # migrate + seed  (npm run db:migrate / db:seed)
npm run dev                   # http://localhost:3000
```

Checks:

```bash
npm run lint
npm run build
```

Sign-in is a **role picker** (no password): Designer, Buyer, Technologist,
**All**, Admin. Each role lands on its own dashboard at `/{role}`.

---

## 2. How the app is built

| Layer | Where | Notes |
| ----- | ----- | ----- |
| Pages & client workspaces | `ui/app/**` | App Router; server components fetch, client components (`*Workspace.tsx`, `*Detail.tsx`, `*List.tsx`) render + mutate |
| Shared shell | `ui/app/components/` | `WorkspaceShell` (left rail) + `GlobalNavbar` (top command bar) + `OperationalWorkspace` primitives |
| API | `ui/app/api/**` | ~49 route handlers — **the entire backend** |
| Server-only data | `ui/lib/**` | Queries, auth (signed httpOnly cookie), input parsing/validation. DB creds never reach the client |
| Schema | `ui/db/schema.sql` | Idempotent Postgres, 41 tables |
| Design system | `ui/app/globals.css` + `workspace.css` | Warm "paper" palette via CSS variables (`--ink`, `--paper`, `--red` …) |

There are **two workspaces** in the repo:

1. **The real, DB-backed process** — Seasons → Styles → Colourways → BOMs →
   Spec/Quality → Sourcing → SKUs → Purchase Orders → Sampling/Inspection.
   Fully persisted, role-gated, audited. **This is the product.**
2. **A legacy prototype** — [`ui/app/Dashboard.tsx`](ui/app/Dashboard.tsx)
   (~4,500 lines), an Automation-vs-Manual demo stored in `localStorage`.
   Retained for reference; its `/*/workflow` routes currently just redirect home.

> ⚠️ **Next.js note:** [`ui/AGENTS.md`](ui/AGENTS.md) warns this is a newer
> Next.js with breaking changes — check `node_modules/next/dist/docs/` before
> writing framework code.

Backend status and phase history: [`ui/BACKEND_STATUS.md`](ui/BACKEND_STATUS.md).

---

## 3. Core navigation (real workspace)

```
/                       Role picker (login)
/{role}                 Dashboard: metrics, recent styles, decision queue, activity
/all/process            Seasons (create/edit) — All role only
/styles  -> /styles/[id]   Styles list -> style detail (colourways, spec, sourcing, SKUs, sampling)
/color-combos/[id]      Colourways list -> combo detail (+ BOM picker)
/boms/[id]              BOM library -> BOM lines
/supplier-requests/[id] Sourcing requests -> quotes
/supplier-quotes/[id]   Quotes -> material cost roll-up
/purchase-orders/[id]   PO list -> PO detail (orders, inspections, 6-step approval -> issue)
/admin                  Reference-data CRUD (17 lists) — modal-based, no rail
```

---

## 4. Frontend improvements — make the UI easier (no backend changes)

Every item below is **frontend-only**. They came out of a full read of both
workspaces and are ordered by impact-to-effort. Nothing here touches `app/api/**`,
`lib/**`, or the schema — the same endpoints and payloads are used throughout.

### Tier 1 — highest impact, low risk

**1. Unify "how do I save?" — one pattern everywhere.**  ✅ _Sourcing screens done._
The app had **four** different save models: detail-route Save button (Styles,
Combos, POs), inline edit-in-list (Seasons,
[`ProcessWorkspace.tsx`](ui/app/all/process/ProcessWorkspace.tsx)), save-on-change
PATCH (`SupplierRequestDetail.tsx` selects PATCH'd the instant they changed), and
Radix modal (Admin). Users relearned saving on every screen. The detail-route
Save-button model is now the canonical one.

- **Done:** [`SupplierRequestDetail.tsx`](ui/app/supplier-requests/[id]/SupplierRequestDetail.tsx)
  no longer PATCHes on every select change. `State` + `Tech approval` edits are
  held locally and committed by a **navbar "Save changes"** button (published via
  `useSetRecordHeader`), with dirty tracking, a "Saved." confirmation, and a
  **beforeunload guard** so edits aren't silently lost on navigation — identical
  to the Styles detail page.
  [`SupplierQuoteDetail.tsx`](ui/app/supplier-quotes/[id]/SupplierQuoteDetail.tsx)
  already batched its field edits behind a "Save cost sheet" button, so no change
  was needed there. Verified: `tsc`, `npm run lint`, and `npm run build` all pass.
- **Remaining (optional, larger):** align Admin's modal CRUD and Seasons'
  inline-edit to the same Save-button model.

**2. Merge "create → then open to fill it in" into one full create form.**  ✅ _Colourways + Styles done._
Screens created a near-empty record then bounced to a detail page to actually
complete it. The create forms are now **full**, so the record is captured in one
place with fewer page hops.

- **Colourways** ([`ColorCombosList.tsx`](ui/app/color-combos/ColorCombosList.tsx)):
  the create form went from **2 fields** (style + name) to the full set — colour
  family, generic, colorway selection, pantone, palette, pack, drop, month, and
  image. The create endpoint already accepted all of these, so it's **one POST,
  no backend change**. On success the form resets and the list reloads in place —
  no forced redirect to the detail page.
- **Styles** ([`StylesWorkspace.tsx`](ui/app/styles/StylesWorkspace.tsx)): the
  create form now also includes the Production & commercial block (pack, drop,
  supplier request, issue date, colour combo, vendors) + image. Identity fields go
  in the create POST; the extras are committed in a single follow-up PATCH behind
  the same button (frontend-only), so the whole style is filled from one form and
  you stay on the list.
- Verified: `tsc`, `npm run lint`, and `npm run build` all pass.
- **Remaining (inherent two-step):** BOMs and POs create a parent that child
  records (material lines / order splits) attach to, so their detail page is still
  where those children are added — their scalar fields could be lifted later, but
  the hop can't be fully removed.

**2b. Inline-expand the sourcing/ordering chain — manage children without a detail hop.**  ✅ _Done._
BOM → supplier request → supplier quote → PO are separate records with a
parent/child dependency chain (a quote can't exist before its request; a PO's
order-lines can't exist before the PO), so they can't collapse into one form. But
each list row now **expands in place** to manage its children — no navigation to a
detail page. All frontend-only, reusing existing endpoints.

- **BOM library** ([`BomsList.tsx`](ui/app/boms/BomsList.tsx)): a row expands to
  the full **material-lines** editor (add / edit / delete). Creating a BOM stays on
  the list and auto-expands the new row so lines go in immediately.
- **Supplier requests** ([`Sourcing.tsx`](ui/app/styles/[id]/Sourcing.tsx)): a
  request row expands to add / manage its **supplier quotes** inline; the quote
  count updates live. Creating a request auto-expands it.
- **Purchase orders** ([`PurchaseOrders.tsx`](ui/app/purchase-orders/PurchaseOrders.tsx)):
  a PO row expands to manage its **order-lines** (split quantities). The 6-step
  approval routing + PO properties **intentionally stay on the detail page** (an
  "Open full PO" link is provided) — cramming an approval workflow into a table
  row would be worse UX, not better.
- **Supplier quote** create already captures every field the create endpoint
  accepts (supplier, country, currency, colours, sizes), both inline and on the
  request detail. The **cost-sheet roll-up** (12 duty/margin fields feeding a
  server calculation) is left on the quote detail page — it's a distinct costing
  task with its own "Save cost sheet" flow, not a create-time field.
- Shared inline-expand styling added to [`globals.css`](ui/app/globals.css)
  (`.inline-expand-row`, `.is-expanded-row`) using the existing paper palette.
  Verified: `tsc`, `npm run lint`, and `npm run build` all pass.

**3. Break the Style-detail mega-page into tabs.**  ✅ _Done._
[`StyleDetail.tsx`](ui/app/styles/[id]/StyleDetail.tsx) used to stack 3 field
sections + 5 independently-fetching sub-workspaces (ColorCombos, SpecQuality,
Sourcing, StyleSkus, Sampling) on one long scroll, each firing its own fetch on
mount (5 spinners at once) with the Save button far away in the navbar.

- The page now has a **tab bar** — **Overview · Colourways · Spec & Quality ·
  Sourcing · SKUs · Sampling** — that swaps sections **in place on the same page**
  (no navigation, no new routes).
- Each child sub-workspace **fetches only when its tab is first opened**, then
  **stays mounted (hidden)** so switching back is instant with no re-fetch and no
  lost input — the page still feels like one continuous record, not separate pages.
- The active tab is mirrored to a client-side **`?tab=` marker** (via
  `router.replace`, `scroll:false`) so refresh keeps your spot and tabs are
  deep-linkable — it never triggers a page load.
- The navbar **Save** button + unsaved-changes guard and the right **sidebar**
  (Assignment / Image / meta, visible on all tabs) are unchanged. Child components
  are reused as-is. Tab bar is keyboard-accessible (`role="tablist"`, arrow keys)
  and styled with the paper palette (`.record-tabs` in
  [`globals.css`](ui/app/globals.css)).
- **Count badges** on the tabs show how many items each style has at a glance
  (Colourways · Sourcing · SKUs · Sampling) without opening them — Colourways is
  seeded free from the style record; the rest fill in when opened and update live
  as you add/remove. Spec & Quality has no badge (it's a 4-kind wrapper with no
  single count). The Colourways tab itself already provides full add / list /
  edit / delete / status / "Add to BOM(s)" for a style's colourways.
- Verified: `tsc`, `npm run lint`, and `npm run build` all pass.

**3b. Consolidate the sidebar — fewer items, grouped by stage.**  ✅ _Done._
The sidebar was a flat list of 8 links with "Supplier requests" and "Supplier
quotes" as two separate items (they're one workflow stage — a quote belongs to a
request). It's now **7 items in 3 labelled groups** in
[`WorkspaceShell.tsx`](ui/app/components/WorkspaceShell.tsx):

- **Plan** — Overview, Seasons (All role)
- **Product** — Styles, BOM library
- **Sourcing & orders** — Sourcing, Purchase orders

**Colourways** were also dropped as a top-level item: a colourway always belongs
to a style (one style → many colourways) and is fully managed under **Style →
Colourways tab**, so a standalone nav item was redundant. The cross-style browse/
search list stays at [`/color-combos`](ui/app/color-combos/), now reached via a
**"Browse all colourways"** link on the Styles page header — no capability lost.

"Supplier requests" + "Supplier quotes" merged into one **Sourcing** workspace at
[`/sourcing`](ui/app/sourcing/page.tsx) with in-place **Requests | Quotes** tabs
(same one-page tab pattern as the style detail — no new navigation). The old
`/supplier-requests` and `/supplier-quotes` list routes now redirect to
`/sourcing`; their per-record detail pages (`/[id]`) are unchanged, so every
existing link still works. Verified: `tsc`, `npm run lint`, `npm run build` pass.

> Note: this reorganises navigation only — **no style fields were removed**. The
> style record still has all 17 fields (Identity, Classification, Production &
> commercial); they live on the **Overview** tab (#3) instead of one long scroll.

**4. Standardise delete confirmation.**
Some deletes use the polished `ConfirmAction` dialog; others use raw
`window.confirm` (`Sourcing.tsx`, `ComboDetail.tsx`, `SupplierRequestDetail.tsx`)
and PO order-remove has none. Route every destructive action through
`ConfirmAction` for a consistent, on-brand experience.

### Tier 2 — meaningful polish

**5. Tame the wide tables.** Styles = 22 columns, Colourways = 16, Seasons = 11.
Show 5–7 key columns by default (name/code, season, owner, status, progress,
actions) and move the rest behind a "More columns" toggle or into the detail page.
Kills the horizontal scroll that hides the row-action cell.

**6. Make the dashboard "Decision queue" actionable.** In
[`RoleHome.tsx`](ui/app/components/RoleHome.tsx) the queue links point at whole
list pages and the count is a crude `styles + open POs` sum. Deep-link each item
to the specific record needing a decision (e.g. `/styles/[id]`,
`/purchase-orders/[id]`) so one click lands on the actual work.

**7. Add "Approve all remaining" to the PO routing.** PO issue is 6 sequential
one-at-a-time "Do" clicks + Issue ([`PoDetail.tsx`](ui/app/purchase-orders/[id]/PoDetail.tsx)).
For the linear happy path, add a single "Approve remaining & issue" that walks the
existing action endpoints in order — keep per-step buttons for when a stage needs
attention.

**8. Retire (or wire up) the dead `/*/workflow` routes.** They redirect home yet
are still titled in `GlobalNavbar`'s `SECTION_TITLES`. Either delete them or make
them deep-link into the workspace.

### Tier 3 — legacy prototype (only if kept in the demo)

- **One progress source of truth.** Automation phase (server) and Manual phase
  (separate `useState` + `plm-manual-progress`) never reconcile — switching mode
  drops you on an unrelated step. Lift a single `{mode, phase, completed}`.
- **Drop redundant "Save draft" buttons** — every manual field already
  auto-persists on keystroke; keep only Export.
- **Collapse the double approvals** (approve-ratio + approve-plan; confirm-review +
  approval-route) into single "Approve & continue" actions.

### Nice-to-have

- A **global search / command palette** (⌘K) — today only Admin has search.
- **Assign-from-list** and **bulk assign** for styles (currently only from the
  detail sidebar).

> Suggested order to implement: **1 → 2 → 3 → 4**, then Tier 2. Items **1 (sourcing
> save) and 2 (full create forms for Colourways + Styles) are done**; items 3–4
> remove the most remaining clicks and "wait, where's the button?" confusion for
> the least code churn.

---

## 5. Where to read more

| Doc | Covers |
| --- | ------ |
| [`ui/README.md`](ui/README.md) | Frontend rebuild phases & run instructions |
| [`ui/BACKEND_STATUS.md`](ui/BACKEND_STATUS.md) | What's built/remaining per phase, 66/66 test suite |
| [`ui/FUNCTIONALITY.md`](ui/FUNCTIONALITY.md) | Legacy prototype behaviour (Automation/Manual) |
| [`ui/IMPLEMENTATION.md`](ui/IMPLEMENTATION.md) · [`ui/PHASES_5_7.md`](ui/PHASES_5_7.md) | Phase design detail |
| [`ui/docs/frontend-rebuild/`](ui/docs/frontend-rebuild/) | Frontend migration plan & phase specs |
| [`ui/design-qa.md`](ui/design-qa.md) · [`ui/styleseed-review.md`](ui/styleseed-review.md) | Design QA & visual review |
