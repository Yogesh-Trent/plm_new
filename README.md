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
- **Tabs | All-sections toggle:** a layout switch at the right of the tab bar
  flips between **Tabs** (default, one section at a time) and **All sections**
  (the classic long-scroll with all six stacked vertically down the page). The
  choice persists per user in `localStorage`.
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

**5b. Table / card view toggle — reusable across list pages.**  ✅ _Styles done; reusable._
Wide tables (Styles = 22 columns) force horizontal scrolling. A **view toggle**
now flips the list between the existing **Table** and an image-forward **Card**
grid. Built as **reusable components** so every list can adopt it:

- [`ViewToggle`](ui/app/components/ViewToggle.tsx) — the Table|Cards switch +
  a `useRecordView(storageKey)` hook that persists the choice per list in
  `localStorage`. Styled as a **frosted-glass pill** (translucent + backdrop
  blur, soft shadow, filled icon on the active side) — the shared `.view-toggle`
  look also used by the style-detail Tabs | All-sections switch. Both toggles are
  **icon-only** (labels kept as `aria-label`/tooltip) and **neutral grey** (no
  accent tint). On the style detail the toggle sits **in the same row as the
  tabs, pinned right**, and the tab strip scrolls horizontally if space is tight
  so the toggle never overlaps the tabs. The app also uses **one global typeface**
  (`Segoe UI Variable`, the sidebar's font) — `body` and `--workspace-display`
  both point at the sans, so headings are no longer serif.
- **Fixed a regression:** the design-system `--muted` token had been overwritten
  to near-white (`oklch(0.97 0 0)`), which made all secondary text (tab labels,
  captions) nearly invisible. Restored to `#6d7074`; tab labels now use
  `--ink-soft` for strong contrast.
- [`RecordCardGrid`](ui/app/components/RecordCardGrid.tsx) — a generic responsive
  card grid; a page maps each record to a small `RecordCardModel` (image, title,
  subtitle, a few fields, a status badge, actions).
- Wired into **Styles** first ([`StylesWorkspace.tsx`](ui/app/styles/StylesWorkspace.tsx)):
  Table stays the default; Cards shows image + name/code + status + season/brand/
  product/colourways/assignee with the same Open / delete / status actions. No
  horizontal scroll. Editing still happens on the detail page.
- Shared card + toggle CSS in [`globals.css`](ui/app/globals.css) (paper palette).
  Verified: `tsc`, `npm run lint`, `npm run build` pass.
- **Next:** drop the same `ViewToggle` + `RecordCardGrid` into Colourways, BOMs,
  and Purchase orders (a small `*ToCard` mapper each — no new components needed).

### New feature — Artwork multiple images

**Artwork now supports multiple reference images.**  ✅ _Done (frontend + small backend guard)._
Under a style's **Spec & Quality → Artwork**, each artwork object can carry up to
**8 images** (uploaded from disk, ~350 KB each).

- Storage reuses the existing `style_objects.data` jsonb (`data.images: string[]`
  as base64 data-URIs) — **no schema or query change**.
- **Backend guard** ([`lib/spec-queries.ts`](ui/lib/spec-queries.ts) →
  `validateArtworkImages`, called from the objects `POST` and style-object
  `PATCH` routes): rejects a non-array, more than 8 images (400), or any image
  over ~350 KB (413), so oversized uploads fail gracefully.
- **UI** ([`StyleObjects.tsx`](ui/app/styles/[id]/StyleObjects.tsx)): a multi-file
  picker + thumbnail grid with per-image remove in the add/edit form; the artwork
  table shows a compact thumbnail strip (first 3 + "+N"). Images load on edit and
  save with the object.
- Verified: `tsc`, `npm run lint`, `npm run build` all pass.

### Tier 2 — meaningful polish

**5. Tame the wide tables.**  ✅ _Done (Styles)._ The Styles list showed all 22
columns (horizontal scroll that hid the row actions). It now shows **key columns
by default** (Image, Name, Code, Colourways, Season, Status, Assigned, actions)
with a **"More columns"** toggle that reveals the full set. The choice persists in
`localStorage`. ([`StylesWorkspace.tsx`](ui/app/styles/StylesWorkspace.tsx).) The
same pattern can be applied to Colourways/Seasons later.

**6. Make the dashboard "Decision queue" actionable.**  ✅ _Done._ In
[`RoleHome.tsx`](ui/app/components/RoleHome.tsx) the queue items now **deep-link**:
when exactly one record needs attention it opens that record (`/styles/[id]`,
`/purchase-orders/[id]`) with an "Open <name>" hint; otherwise it links to the
tightest filtered list (`/styles?assigned=<role>`) instead of the whole page.

**7. Add "Approve all remaining" to the PO routing.**  ✅ _Done._
[`PoDetail.tsx`](ui/app/purchase-orders/[id]/PoDetail.tsx) now has a single
**"Approve all remaining & issue"** button that walks every not-yet-done step of
the Sourcing → Accounts → Merch route in order and issues the PO — one click for
the linear happy path. The per-step "Do" buttons remain for when a stage needs
individual attention.

**8. Retire the dead `/*/workflow` routes.**  ✅ _Done._ The four
`/{role}/workflow` pages only redirected to the role home and were orphaned
(nothing linked to them). Removed the route files and the stale `Workflow` entry
in `GlobalNavbar`'s `SECTION_TITLES`.

### Modern date picker  ✅ _Done._

Replaced every native `<input type="date">` / `datetime-local` (~10, OS-default
calendars) with a **custom date picker** — a styled trigger showing the formatted
date that opens a **month-grid calendar in a Radix popover**, matching the paper
palette (month nav, today/selected states, an optional time field, Clear/Today).

- Component: [`app/components/DatePicker.tsx`](ui/app/components/DatePicker.tsx),
  built on the already-installed `radix-ui` **Popover** — **no new dependencies**
  (no react-day-picker/date-fns). `withTime` adds a time field for datetime
  fields. Keyboard/focus accessible; respects `prefers-reduced-motion`.
- Value stays the same string format the inputs used (`YYYY-MM-DD` /
  `YYYY-MM-DDTHH:mm`), so it's a **drop-in swap** — no data/endpoint changes.
- Rolled across all date fields: Styles (list + detail), Seasons, Sourcing,
  Purchase orders (list + detail), Inspections. Styles in
  [`globals.css`](ui/app/globals.css).

### Custom toast (react-hot-toast)  ✅ _Done._

Switched notifications from `sonner` to **react-hot-toast** with a **custom card**
adapted to the paper palette (Tailwind-styled): a status icon, a title, an
optional message, and a Close button, with a coloured left border per variant
(green / red / neutral) and slide-in/out animations.

- Helper: [`app/components/toast.tsx`](ui/app/components/toast.tsx) exposes
  `toast.success/error/info(title, { description })` — the **same call shape** the
  app already used, so the 5 call sites only needed their import swapped.
- [`AppToaster`](ui/app/components/AppToaster.tsx) now renders react-hot-toast's
  `<Toaster>`. Animations (`animate-custom-enter/leave`) live in
  [`globals.css`](ui/app/globals.css) and respect `prefers-reduced-motion`.
- No external assets (the original example's Unsplash avatar / indigo were
  dropped in favour of the app's own look). `sonner` is no longer imported.

### UI refinement pass  ✅ _Done._

A subtle polish over the existing warm/paper identity (no restructuring, additive
CSS at the end of [`globals.css`](ui/app/globals.css)):

- **Tables** — uppercase muted column headers, a quiet row-hover highlight,
  cleaner last-row border.
- **Buttons** — the primary button gained a hover (brighten + soft shadow) it was
  missing; ghost/icon buttons highlight on hover; all get a 1px press feedback.
- **Inputs** — softer brand focus ring (`box-shadow` instead of a hard outline)
  across input/select/textarea, plus a hover border cue.
- **Status pills** (when interactive) and **cards** get gentle hover feedback; the
  card grid lifts slightly on hover.
- All motion respects `prefers-reduced-motion`.

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
