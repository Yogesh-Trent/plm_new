# Phase 3 — Theme Toggle Control & Placement

**Part of:** [Dual-Theme System plan](../2026-07-24-dual-theme-apple-clean.md)
**Status:** Pending (starts after Phase 2)

## Goal

Build one reusable `ThemeToggle` and place it in **two** locations, both driven by the same
`useTheme()` state so they always agree:

- **Top bar** — compact quick switch (`variant="compact"`), from anywhere in the app.
- **Settings / admin** — labeled "Appearance" row (`variant="labeled"`), discoverable.

## Deliverables

| File | Responsibility |
|------|----------------|
| `ui/app/components/ThemeToggle.tsx` | New. Segmented Paper/Apple control; `compact` and `labeled` variants. |
| `ui/app/globals.css` (modified) | Base (Paper) styles for `.theme-switch` / `.theme-switch-row`. |
| `ui/app/themes.css` (modified) | Apple variant of the toggle (blue selected, pill radius, shadow row). |
| `ui/app/Dashboard.tsx` (modified) | Insert `<ThemeToggle variant="compact" />` into `.top-actions`. |
| `ui/app/admin/AdminWorkspace.tsx` (modified) | Insert `<ThemeToggle variant="labeled" />` as an Appearance section. |

## Tasks

- **Task 3.1** — `ThemeToggle` component + base and Apple styles.
- **Task 3.2** — Place compact toggle in the top bar (`Header` in `Dashboard.tsx`).
- **Task 3.3** — Place labeled toggle in settings (`AdminWorkspace.tsx`).

## Key constraints

- Both instances read `useTheme()` — no local state; they stay in sync automatically.
- Toggle must be keyboard-operable with `aria-pressed` on each option and `role="group"`.

## Definition of done

- Top-bar toggle flips the app live and persists across reload + navigation.
- `/admin` shows a labeled "Appearance" row; changing either toggle updates the other.

## Verification

1. Sign in, view a dashboard → toggle in top bar flips theme live; persists on reload.
2. `/admin` → labeled toggle present; change it → top-bar toggle reflects the same value.
3. Keyboard-tab to the toggle, activate with Enter/Space → works; focus ring visible.

## Next

→ [Phase 4 — Apple Layout Restructures & Verification](./PHASE-4-restructure.md)
