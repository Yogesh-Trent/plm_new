# Phase 4 — Apple Layout Restructures & Verification

**Part of:** [Dual-Theme System plan](../2026-07-24-dual-theme-apple-clean.md)
**Status:** Pending (starts after Phase 3)

## Goal

Give the three chosen surfaces a genuine **layout restructure** under `.theme-apple` (not
just recolor) — airier hero type, generous whitespace, soft-shadow cards that lift on
hover — then run a full manual verification pass. Paper & Ink stays unchanged throughout.

## Surfaces getting the full restructure

1. **Login / role picker** (`.auth-*-v2` in `RolePicker.tsx`) — large tight hero headline, role options as floating rounded cards.
2. **Dashboard headers & summary cards** (`.merged-heading`, `.screen-heading`, `.summary-card`, `.mapping-stats`, `.stat`) — bigger headings, more air, stat tiles as individual shadowed cards.
3. **Record list pages** (`.table-wrap`, `RecordCardGrid`, list headings) — rounded shadowed table panels, roomier rows, blue hover, cards that lift.

## Deliverables

| File | Responsibility |
|------|----------------|
| `ui/app/themes.css` (modified) | Append `.theme-apple` layout overrides for the three surfaces. |

All changes are CSS scoped under `.theme-apple` — no component structure changes, so Paper
is provably unaffected.

## Tasks

- **Task 4.1** — Login / role picker restructure.
- **Task 4.2** — Dashboard headers & summary cards restructure.
- **Task 4.3** — Record list pages restructure (confirm real `RecordCardGrid` class names first).
- **Task 4.4** — Full verification pass (regression, cross-surface, persistence/no-flash, toggle sync + a11y, storage-disabled resilience, `npm run build`).

## Definition of done

- Login, dashboard headers/cards, and list pages show the airier Apple layout in Apple theme.
- Paper theme identical to before across every surface.
- `npm run build` passes with no type errors.
- No broken/overflowing layouts in either theme.

## Verification (Task 4.4 summary)

1. Paper regression: login → dashboard → `/styles` → workflow page unchanged.
2. Apple across surfaces: same path + `/boms`, `/purchase-orders`, `/admin` — clean.
3. Persistence + no-flash on hard reload.
4. Toggle sync (top bar ↔ admin) + keyboard a11y.
5. localStorage disabled → loads in Paper without errors.
6. `npm run build` succeeds.

## Done

This completes the dual-theme system. → back to [main plan](../2026-07-24-dual-theme-apple-clean.md).
