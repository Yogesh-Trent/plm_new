# Threadline UI consistency audit

Date: 23 July 2026

## Decision

The role overview shown in `11-44-12` is the canonical Threadline product
system. Every authenticated page now uses that same navigation rail, top bar,
typography, spacing, colour, controls, tables, and responsive frame.

The former Workflow Studio was the source of the extra dashboard. It rendered
`prototype.json` and browser-local state rather than the live PLM record APIs.
Its navigation entry has been removed and all four old workflow URLs now return
the user to the live role overview.

## Screenshot-by-screenshot findings

### 1. Sign in — healthy

![Threadline sign in](./Screenshot%202026-07-23%20at%2011-43-09%20Threadline%20PLM.png)

The intended editorial Threadline language is clear and accessible. This is
the authentication reference for the rest of the system.

### 2. Admin / Departments — inconsistent before correction

![Admin departments before correction](./Screenshot%202026-07-23%20at%2011-43-40%20Threadline%20PLM.png)

The separate white PLM header, burgundy role badge, and standalone sign-out
control made Admin look like another application. Admin is now inside the
shared Threadline shell and keeps only its useful reference-list subnavigation.

### 3. Admin / Brands — inconsistent before correction

![Admin brands before correction](./Screenshot%202026-07-23%20at%2011-43-48%20Threadline%20PLM.png)

The same duplicate shell affected every reference list. The correction is
applied at the Admin workspace level, so all 18 reference lists inherit it.

### 4. Admin / Product types — inconsistent before correction

![Admin product types before correction](./Screenshot%202026-07-23%20at%2011-43-56%20Threadline%20PLM.png)

Buttons, list rows, focus states, and active-list styling now use Threadline's
verdigris and neutral tokens instead of the legacy pink/burgundy palette.

### 5. Role overview — healthy and selected as the reference

![Threadline role overview](./Screenshot%202026-07-23%20at%2011-44-12%20Threadline%20PLM.png)

This is the canonical authenticated shell: one persistent rail, one top bar,
one role context, and live backend metrics.

### 6. Workflow Studio — retired from the product

![Legacy Workflow Studio](./Screenshot%202026-07-23%20at%2011-44-45%20Threadline%20PLM.png)

This was not a second backend dashboard. It was a prototype/manual flow using
bundled JSON and `localStorage`. Keeping it beside live routes created both a
visual inconsistency and an unclear source of truth. It is no longer linked or
rendered by a route.

### 7. Seasons — backend-correct, visually inconsistent before correction

![Seasons before correction](./Screenshot%202026-07-23%20at%2011-44-56%20Threadline%20PLM.png)

The live Season CRUD remains unchanged. Its redundant process sidebar has been
removed; the page now uses the shared shell, Threadline page header, controls,
cards, and data-table treatment.

### 8. Styles — backend-correct, visually inconsistent before correction

![Styles before correction](./Screenshot%202026-07-23%20at%2011-45-05%20Threadline%20PLM.png)

The live Style CRUD remains unchanged. Duplicate dashboard and module links
were removed from its header because the shared rail now owns navigation.

## Route source-of-truth map

| Product area           | Route                         | Data source                | Shell status               |
| ---------------------- | ----------------------------- | -------------------------- | -------------------------- |
| Role overview          | `/<role>`                     | database query modules     | canonical shared shell     |
| Reference data         | `/admin`                      | `/api/admin/*`             | shared shell               |
| Seasons                | `/all/process`                | `/api/seasons`             | shared shell               |
| Styles                 | `/styles` and `/styles/:id`   | style APIs and queries     | shared shell               |
| Colourways             | `/color-combos` and detail    | colourway APIs and queries | shared shell               |
| BOMs                   | `/boms` and `/boms/:id`       | BOM APIs and queries       | shared shell               |
| Supplier requests      | `/supplier-requests/:id`      | sourcing queries           | shared shell               |
| Supplier quotes        | `/supplier-quotes/:id`        | sourcing queries           | shared shell               |
| Purchase orders        | `/purchase-orders` and detail | PO APIs and queries        | shared shell               |
| Legacy Workflow Studio | `/<role>/workflow`            | prototype JSON/local state | redirects to live overview |

## StyleSeed quality gate: 86 / 100 — B

| Category           | Score | Evidence                                                                                                                                                         |
| ------------------ | ----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coherence          | 17/20 | One shell, one Phosphor icon family, 7–10px working radii, and one verdigris action accent (`workspace.css:6-21`, `1489-1513`).                                  |
| Colour discipline  | 10/16 | Semantic tokens own the main palette, focus, and alert roles; active status pills remain intentionally coloured on data rows (`workspace.css:1526-1534`).        |
| Hierarchy and type | 15/16 | Georgia is reserved for page/display hierarchy while system sans handles operational data (`workspace.css:1413-1424`).                                           |
| Layout and spacing | 11/12 | Every backend module uses the same 1500px frame and responsive 20–56px gutters (`workspace.css:1365-1400`).                                                      |
| States             | 10/12 | Role overview, Seasons, Admin, Styles, Colourways, and POs expose loading/empty/error treatment; some legacy empty rows can gain richer next actions in Phase 2. |
| UX writing         | 11/12 | Primary controls name their action; remaining compact legacy labels are scheduled for the list refactor.                                                         |
| Motion and polish  | 12/12 | Motion is restrained and the system includes reduced-motion handling (`workspace.css:1329-1342`).                                                                |

The quality gate clears the 80-point shipping floor. The remaining deductions
are documented Phase 2/3 refinements, not competing dashboard systems.
