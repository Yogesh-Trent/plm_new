# Phase 2 — Apple Clean Style Layer

**Part of:** [Dual-Theme System plan](../2026-07-24-dual-theme-apple-clean.md)
**Status:** Pending (starts after Phase 1)

## Goal

Create `themes.css` with all `.theme-apple` overrides: the core variable palette, plus
global restyle passes for typography, depth/shadows, and buttons. After this phase,
flipping the theme class **visibly changes the whole app**. Paper & Ink stays untouched
because every rule is scoped under `.theme-apple` — nothing is added to `:root`.

## Why this works with so little CSS

The app reads everything from CSS variables (`--ink`, `--paper`, `--red`, `--line`,
`--radius`, shadcn oklch tokens). Redefining those under `.theme-apple` re-themes ~90% of
the app automatically. We only hand-write rules for typography (serif → sans), depth
(hairline borders → soft shadows), and buttons (red → blue pills).

## Deliverables

| File | Responsibility |
|------|----------------|
| `ui/app/themes.css` | New. `.theme-apple` variable layer + typography/shadow/button restyle. |
| `ui/app/layout.tsx` (modified) | Import `themes.css` **after** `globals.css` and `workspace.css` so it wins. |

## Apple Clean identity (locked)

- Surfaces: `#ffffff` / `#f5f5f7` (cool gray), not warm cream.
- Accent: Apple blue `#0071e3` (replaces red `--red`).
- Type: Geist sans everywhere; headings tight (`letter-spacing: -0.02em`), serif removed.
- Shape/depth: radius 12px+, soft diffuse shadows instead of hairline borders.
- Grays: cool neutrals (`--muted #6e6e73`, `--line #e5e5e7`).

## Tasks

- **Task 2.1** — Core variable override layer + import wiring.
- **Task 2.2** — Typography restyle (serif headings → clean sans).
- **Task 2.3** — Depth (soft shadows on cards) + button restyle (blue pills).

## Definition of done

- `theme-apple` shows white/cool-gray surfaces, blue accents, sans headings, soft-shadow cards, blue pill buttons.
- `theme-paper` is byte-for-byte the original look.

## Verification

1. Apple theme: backgrounds white/gray, borders soft, accents blue across several pages.
2. Headings render sans-serif (Apple) vs Georgia serif (Paper).
3. Cards float on shadows; primary buttons are blue pills with hover lift.
4. Switch back to Paper → original warm look returns exactly.

## Next

→ [Phase 3 — Theme Toggle Control & Placement](./PHASE-3-toggle.md)
