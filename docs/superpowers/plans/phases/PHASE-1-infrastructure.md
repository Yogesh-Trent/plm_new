# Phase 1 — Theme Infrastructure

**Part of:** [Dual-Theme System plan](../2026-07-24-dual-theme-apple-clean.md)
**Status:** ✅ Complete — verified in-browser (theme applied pre-paint, 0 console warnings)

## Goal

The app can switch the `<html>` class between `theme-paper` and `theme-apple`, driven by
`localStorage`, with **no flash of the wrong theme** on load, and expose the current theme
through a `useTheme()` hook. **No visual change yet** — both classes look identical until
Phase 2 adds the Apple styles.

## Why this phase is first

Everything else depends on the class-on-`<html>` mechanism and the hook. Get the plumbing
right and provably working before writing a single line of look-and-feel.

## Deliverables

| File | Responsibility |
|------|----------------|
| `ui/app/lib/theme.ts` | Theme type + constants (`Theme`, `THEME_STORAGE_KEY`, `normalizeTheme`, `themeClass`, `THEME_LABELS`, `THEMES`). |
| `ui/app/components/ThemeScript.tsx` | Pre-paint inline `<script>` that sets the `<html>` class from `localStorage` before first paint. |
| `ui/app/components/ThemeProvider.tsx` | React context provider + `useTheme()` hook; reads/writes `localStorage`, applies the class on change. |
| `ui/app/layout.tsx` (modified) | Renders `ThemeScript` in `<head>`, wraps body in `ThemeProvider`, adds `suppressHydrationWarning`. |

## Tasks

- **Task 1.1** — Pre-paint theme script + theme constants (`theme.ts`, `ThemeScript.tsx`, layout head wiring).
- **Task 1.2** — `ThemeProvider` + `useTheme` hook, wrap the app body.

## Key constraints

- Default is `paper`; anything not exactly `"apple"` normalizes to `paper`.
- All `localStorage` access wrapped in try/catch — never crash if storage is unavailable.
- Read the Next.js head/metadata guide in `ui/node_modules/next/dist/docs/` before editing
  `layout.tsx` (this Next 16 has breaking changes per `ui/AGENTS.md`).

## Definition of done

- `<html>` carries a `theme-*` class on first paint, no flicker.
- Setting `localStorage.plm-theme = "apple"` and reloading applies `theme-apple`.
- `useTheme()` works with no "must be used within ThemeProvider" errors.
- App renders normally; `npm run dev` clean.

## Verification

1. `npm run dev`; DevTools shows `<html class="… theme-paper">` on fresh load.
2. Console: `localStorage.setItem("plm-theme","apple")` → reload → class is `theme-apple`, no flash.
3. No console errors on any page.

## Next

→ [Phase 2 — Apple Clean Style Layer](./PHASE-2-style-layer.md)
