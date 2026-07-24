# Dual-Theme System: "Paper & Ink" ↔ "Apple Clean"

**Date:** 2026-07-24
**Status:** Approved design, ready for implementation planning

## Summary

Add a user-selectable UI theme to the Threadline PLM app. Users toggle between two
complete visual identities:

- **Paper & Ink** (default) — the existing warm cream/deep-red/Georgia-serif design.
  Unchanged.
- **Apple Clean** (new) — crisp white surfaces, cool neutral grays, Apple-blue accent
  (`#0071e3`), clean sans-serif typography throughout, larger radii, soft diffuse
  shadows, and generous whitespace.

The choice is saved in `localStorage` (per-device), applied before first paint (no flash),
and switchable from both a top-bar quick toggle and an "Appearance" setting in the
settings/admin area.

## Goals

- One toggle flips the entire app's look with **zero per-component rewrites**.
- Paper & Ink remains byte-for-byte the current experience when selected.
- Apple Clean feels genuinely premium: whitespace, soft shadows, refined type.
- Three surfaces get a full **layout restructure** under Apple Clean (not just restyle):
  login/role picker, dashboard headers & summary cards, and record list pages.
- No flash of wrong theme on load.

## Non-Goals

- No backend / database changes. Persistence is `localStorage` only.
- No new dependencies. (Geist sans is already loaded; Framer Motion already present.)
- No dark mode. Both themes are light. (A future `theme-apple-dark` could slot in later
  using the same mechanism, but is out of scope.)
- No restructure of the deep workflow/execution screens beyond restyle.

## Key Architectural Insight

The entire app is styled through **global CSS classes** (`.topbar`, `.phase-item`,
`.summary-card`, `.role-option-v2`, …) that read from **CSS custom properties** defined in
`:root` in [globals.css](../../../ui/app/globals.css) — `--ink`, `--paper`, `--red`,
`--line`, `--radius`, `--control-h`, plus the shadcn oklch tokens (`--background`,
`--primary`, `--card`, …).

Therefore theming = **redefining those variables under a class on `<html>`**. Every one of
the 25+ pages changes instantly because they all consume the same variables. We only write
per-component CSS for the handful of places that need an actual *layout* change under Apple
Clean.

```
<html class="theme-paper">   → default variable values (current look)
<html class="theme-apple">   → Apple Clean variable overrides
```

## Architecture

### Components (new)

All new files live in `ui/app/components/`.

**`ThemeProvider.tsx`** (client component)
- What it does: owns the current theme, persists it, applies the `theme-*` class to
  `document.documentElement`, and exposes it via context.
- Interface:
  - `<ThemeProvider>{children}</ThemeProvider>` — wraps the app body.
  - `useTheme(): { theme: "paper" | "apple"; setTheme(t): void; toggle(): void }`.
- Depends on: `localStorage` key `plm-theme`; React context.
- Behavior: on mount, reads `plm-theme` (default `"paper"`), reflects it into a class on
  `<html>`. `setTheme`/`toggle` write `localStorage` and update the class + context.

**`ThemeScript.tsx`** (or an inline `<script>` string in `layout.tsx`)
- What it does: a tiny synchronous script injected into `<head>` that reads
  `localStorage.plm-theme` and sets the `<html>` class **before first paint**, eliminating
  the flash of wrong theme. This runs before React hydrates.
- Interface: rendered once in the root layout `<head>`.
- Depends on: nothing (pure inline JS string). Must be resilient if `localStorage` is
  unavailable (wrap in try/catch, default to `theme-paper`).

**`ThemeToggle.tsx`** (client component)
- What it does: a segmented control with two options, "Paper" and "Apple", reflecting and
  setting the current theme via `useTheme()`.
- Interface: `<ThemeToggle variant="compact" | "labeled" />`.
  - `compact` — icon/short form for the top bar.
  - `labeled` — full "Appearance" row for the settings page.
- Depends on: `useTheme()`.
- Accessibility: `role="group"`, `aria-pressed` on each option, keyboard operable.

### CSS (new)

**`ui/app/themes.css`** — imported once in `layout.tsx` after `globals.css` and
`workspace.css`.

Structure:
```css
/* Paper is the default — values already live in :root in globals.css.
   We optionally mirror them under .theme-paper for symmetry, but :root
   already covers the default, so .theme-paper can be a no-op / safety net. */

.theme-apple {
  /* Core palette overrides */
  --ink: #1d1d1f;
  --ink-soft: #424245;
  --muted: #6e6e73;
  --line: #e5e5e7;
  --line-strong: #d2d2d7;
  --paper: #ffffff;
  --paper-raised: #ffffff;
  --soft: #f5f5f7;
  --red: #0071e3;          /* accent — now Apple blue */
  --red-soft: #ecf4ff;
  --green: #1d8a4e;
  --orange: #b25000;
  --focus: #0071e3;
  --radius: 12px;

  /* shadcn oklch tokens → cool neutral + blue primary */
  --primary: oklch(0.55 0.18 250);
  --ring: oklch(0.55 0.18 250);
  /* …remaining oklch tokens tuned to cool grays… */

  /* New Apple-only tokens */
  --shadow-card: 0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06);
  --shadow-raised: 0 4px 16px rgba(0,0,0,.08), 0 24px 48px rgba(0,0,0,.10);
  --heading-font: var(--font-sans), "SF Pro Display", -apple-system, sans-serif;
}
```

Then **theme-scoped restyle + restructure rules**, all prefixed with `.theme-apple`:

1. **Global restyle (automatic via variables):** borders, backgrounds, radii, accent, and
   focus colors flip everywhere the variables are consumed. No extra CSS needed for most of
   the app.

2. **Typography override (restyle):**
   - `.theme-apple .screen-heading h1`, `.manual-heading h1`, `.resolve-main h2`,
     `.manual-section h2` etc. → switch `font-family` from Georgia serif to
     `var(--heading-font)`, add `letter-spacing: -0.02em`, adjust weight/size for the
     tighter Apple display look.

3. **Depth override (restyle):** cards/panels that currently rely on hairline borders
   (`.summary-card`, `.preflight-card`, `.event-log`, `.context-panel`, popovers…) gain
   `box-shadow: var(--shadow-card)` and softer/──removed borders under `.theme-apple`.

4. **Buttons (restyle):** `.action-buttons .primary`, `.text-button`, `.mode-switch`,
   `.dashboard-switch` → Apple-blue fills, pill/rounded radii, subtle hover lift.

5. **Layout restructure (the three chosen surfaces):**
   - **Login / role picker** (`.auth-shell-v2`, `.auth-story`, `.role-grid-v2`,
     `.role-option-v2`): under `.theme-apple`, become airier — larger hero type, more
     whitespace, role options as soft-shadow cards with rounded corners, centered emphasis.
   - **Dashboard headers & summary cards** (`.merged-heading`, `.screen-heading`,
     `.summary-card`, `.mapping-stats`, `.stat`): larger heading scale, more padding,
     card grids with `--shadow-card`, hairline dividers softened.
   - **Record list pages** (`.table-wrap`, `RecordCardGrid`, list page headings): roomier
     cards, cleaner table styling (more row height, lighter borders, blue hover), softer
     container.

### Integration points (edits to existing files)

- **[layout.tsx](../../../ui/app/layout.tsx):**
  - Import `./themes.css` after the existing CSS imports.
  - Add the pre-paint `ThemeScript` inline in `<head>`.
  - Wrap `{children}` (and `GlobalBackground`, toaster) in `<ThemeProvider>`.
  - Note: per `ui/AGENTS.md`, this Next.js version has breaking changes — **read the
    relevant guide in `node_modules/next/dist/docs/` before editing layout/head handling.**

- **[Dashboard.tsx](../../../ui/app/Dashboard.tsx) `Header`:** add `<ThemeToggle variant="compact" />`
  into the `.top-actions` cluster (near the existing dashboard-switch / sync indicator).

- **Settings/admin surface** (`admin/AdminWorkspace.tsx`, reached via
  [admin/page.tsx](../../../ui/app/admin/page.tsx)): add an "Appearance" section containing
  `<ThemeToggle variant="labeled" />`. This is the discoverable settings entry point.
  (If a more appropriate shared settings location exists, place it there; admin is the
  current best fit.)

## Data Flow

```
Page load
  → inline ThemeScript reads localStorage.plm-theme (try/catch, default "paper")
  → sets <html class="theme-paper|theme-apple">  [before paint]
  → React hydrates; ThemeProvider re-reads same value, syncs context
  → CSS variables under the active class cascade to every component

User clicks ThemeToggle (top bar or settings)
  → useTheme().setTheme(next)
  → writes localStorage.plm-theme
  → swaps <html> class
  → all variable-driven styles + theme-scoped rules re-render instantly
  → (optional) a brief CSS transition on background/color for a smooth flip
```

## Error Handling

- `localStorage` unavailable / throws (private mode, SSR): the inline script and provider
  both wrap access in try/catch and fall back to `"paper"`. The app never crashes on theme.
- Unknown/legacy stored value: normalize anything not `"apple"` to `"paper"`.
- SSR/hydration: server renders no theme class (or always `theme-paper`); the pre-paint
  script sets the real class before hydration so there is no visible mismatch. `suppressHydrationWarning`
  on `<html>` if needed for the class attribute.

## Testing

Manual verification (no test framework is set up in this UI project; verify by running the
app — see the `run` skill):

1. Default load with empty `localStorage` → Paper & Ink renders (regression: current look
   unchanged across a few representative pages).
2. Toggle to Apple in the top bar → entire app flips (login, a dashboard, a list page,
   a workflow page) to white/blue/sans; reload → stays Apple (no flash).
3. Toggle in settings "Appearance" → same effect; both toggles stay in sync.
4. Restructured surfaces (login, dashboard header/cards, list pages) show the airier
   Apple layout under Apple, and the original layout under Paper.
5. Accessibility: toggle is keyboard-operable; focus rings visible in both themes; contrast
   acceptable on primary buttons and body text in Apple Clean.
6. `localStorage` disabled → app still loads in Paper without error.

## Open Questions

None — all identity decisions resolved:
- Persistence: localStorage (per-device).
- Accent: Apple blue `#0071e3`.
- Restructure scope: login/role picker + dashboard headers & cards + list pages.
- Toggle location: top bar **and** settings.

## Build Sequence (for the plan)

1. Theme infrastructure: `ThemeProvider`, `ThemeScript`, `useTheme`, layout wiring
   (verify the flip works with a temporary hardcoded class before styling).
2. `themes.css` core variable layer for `.theme-apple` (palette, radius, shadows, fonts).
3. Global restyle passes: typography, depth/shadows, buttons.
4. `ThemeToggle` component + placement in top bar and settings.
5. Layout restructures: login → dashboard headers/cards → list pages.
6. Full manual verification pass across representative pages in both themes.
