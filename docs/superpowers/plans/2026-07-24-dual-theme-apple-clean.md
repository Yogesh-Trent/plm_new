# Dual-Theme System (Paper & Ink / Apple Clean) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-selectable UI theme toggle that flips the whole app between the existing "Paper & Ink" look and a new "Apple Clean" look, persisted per-device.

**Architecture:** All styling reads from CSS custom properties in `:root`. A theme = redefining those properties under a `theme-*` class on `<html>`. A pre-paint inline script + a React `ThemeProvider` set that class from `localStorage`. Only three surfaces get extra layout-restructure CSS; everything else re-themes automatically through the variables.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4, plain global CSS, Framer Motion (already present), Geist font (already loaded).

## Global Constraints

- **No new dependencies.** Use only what `ui/package.json` already has.
- **No backend / DB changes.** Persistence is `localStorage` key `plm-theme` only.
- **Default theme is `paper`.** Any stored value that isn't exactly `"apple"` normalizes to `"paper"`.
- **Paper & Ink must stay visually identical** to today when selected — Apple styles live *only* under `.theme-apple`, never in `:root`.
- **No flash of wrong theme** — the `<html>` class must be set before first paint.
- **Read the Next.js guide first.** Per `ui/AGENTS.md`, this Next.js has breaking changes; before editing `layout.tsx`/head handling, read the relevant file in `ui/node_modules/next/dist/docs/`.
- **All work happens in the `ui/` directory.** Paths below are relative to `ui/` unless stated.
- **No test framework exists in this project.** "Tests" are explicit manual verification steps run against `npm run dev`.
- **Accent color for Apple Clean is `#0071e3`** (Apple blue), replacing the red `--red`.

---

## Phase 1 — Theme Infrastructure

Goal: the app can switch `<html>` class between `theme-paper`/`theme-apple` from `localStorage`, with no flash, and expose it via a hook. No visual change yet (both classes look identical until Phase 2).

### Task 1.1: Pre-paint theme script + theme constants

**Files:**
- Create: `app/lib/theme.ts`
- Create: `app/components/ThemeScript.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `app/lib/theme.ts` exports:
  - `type Theme = "paper" | "apple"`
  - `const THEME_STORAGE_KEY = "plm-theme"`
  - `function normalizeTheme(value: unknown): Theme` — returns `"apple"` only if value === `"apple"`, else `"paper"`.
  - `function themeClass(theme: Theme): string` — returns `"theme-paper"` or `"theme-apple"`.
- Produces: `ThemeScript` — a React component rendering a `<script>` that, before paint, reads `localStorage[plm-theme]` (try/catch) and adds `theme-paper`/`theme-apple` to `document.documentElement.classList`.

- [ ] **Step 1: Create theme constants**

Create `app/lib/theme.ts`:

```ts
export type Theme = "paper" | "apple";

export const THEME_STORAGE_KEY = "plm-theme";
export const THEMES: Theme[] = ["paper", "apple"];

export const THEME_LABELS: Record<Theme, string> = {
  paper: "Paper & Ink",
  apple: "Apple Clean",
};

export function normalizeTheme(value: unknown): Theme {
  return value === "apple" ? "apple" : "paper";
}

export function themeClass(theme: Theme): string {
  return theme === "apple" ? "theme-apple" : "theme-paper";
}
```

- [ ] **Step 2: Create the pre-paint script component**

Create `app/components/ThemeScript.tsx`:

```tsx
import { THEME_STORAGE_KEY } from "@/app/lib/theme";

// Runs synchronously in <head> before first paint so the correct theme class
// is on <html> before any styles apply — prevents a flash of the wrong theme.
export function ThemeScript() {
  const js = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY,
  )});var c=t==="apple"?"theme-apple":"theme-paper";document.documentElement.classList.add(c);}catch(e){document.documentElement.classList.add("theme-paper");}})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
```

- [ ] **Step 3: Read the Next.js head/metadata guide**

Run: `ls app/../node_modules/next/dist/docs/` (from `ui/`), then read the file covering `head`/`layout`/`metadata` to confirm how to place a `<script>` in `<head>` for this Next version.
Expected: you can state where a raw `<script>` belongs in the root layout for Next 16.

- [ ] **Step 4: Wire ThemeScript into the layout head**

Modify `app/layout.tsx` — add the import and render `<ThemeScript />` inside `<head>`. Also add `suppressHydrationWarning` to `<html>` because the class attribute differs between server and client:

```tsx
import { ThemeScript } from "./components/ThemeScript";
// ...
return (
  <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
    <head>
      <ThemeScript />
    </head>
    <body>
      {/* unchanged */}
    </body>
  </html>
);
```

- [ ] **Step 5: Verify no flash / class applied**

Run: `npm run dev`, open the app, DevTools → `<html>` element.
Expected: `<html class="... theme-paper">` present on first load. In console: `localStorage.setItem("plm-theme","apple")` then reload → class is `theme-apple`. No flicker on load.

- [ ] **Step 6: Commit**

```bash
git add app/lib/theme.ts app/components/ThemeScript.tsx app/layout.tsx
git commit -m "feat(theme): add pre-paint theme script and theme constants"
```

### Task 1.2: ThemeProvider + useTheme hook

**Files:**
- Create: `app/components/ThemeProvider.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `Theme`, `THEME_STORAGE_KEY`, `normalizeTheme`, `themeClass` from `app/lib/theme.ts`.
- Produces:
  - `<ThemeProvider>{children}</ThemeProvider>` (client component).
  - `useTheme(): { theme: Theme; setTheme(t: Theme): void; toggle(): void }`.

- [ ] **Step 1: Create the provider and hook**

Create `app/components/ThemeProvider.tsx`:

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  type Theme,
  THEME_STORAGE_KEY,
  normalizeTheme,
  themeClass,
} from "@/app/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "paper";
  }
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("theme-paper", "theme-apple");
  root.classList.add(themeClass(theme));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with "paper" for SSR; the pre-paint script already set the real class,
  // and the effect below syncs React state to the stored value on mount.
  const [theme, setThemeState] = useState<Theme>("paper");

  useEffect(() => {
    setThemeState(readStoredTheme());
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyThemeClass(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore — theme still applies for this session */
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "apple" ? "paper" : "apple");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
```

- [ ] **Step 2: Wrap the app body in ThemeProvider**

Modify `app/layout.tsx` — wrap the body contents:

```tsx
import { ThemeProvider } from "./components/ThemeProvider";
// ...
<body>
  <ThemeProvider>
    <GlobalBackground />
    <a className="workspace-skip-link" href="#main-content">Skip to main content</a>
    {children}
    <AppToaster />
  </ThemeProvider>
</body>
```

- [ ] **Step 3: Temporary smoke test of the hook**

Temporarily add to `app/components/GlobalBackground.tsx` a `console.log` via a tiny inline client wrapper is overkill — instead verify in DevTools: after Task 1.2, run in console:
`document.documentElement.className` before and after `localStorage.setItem` is not the test. The real test: build passes and no "must be used within ThemeProvider" error appears.

Run: `npm run dev` and load the app.
Expected: app renders normally, no console errors, `<html>` still carries a `theme-*` class.

- [ ] **Step 4: Commit**

```bash
git add app/components/ThemeProvider.tsx app/layout.tsx
git commit -m "feat(theme): add ThemeProvider and useTheme hook"
```

---

## Phase 2 — Apple Clean Style Layer

Goal: `themes.css` defines all `.theme-apple` variable overrides + global restyle (palette, typography, depth, buttons). Flipping the class now visibly changes the whole app. Paper untouched.

### Task 2.1: Core variable override layer

**Files:**
- Create: `app/themes.css`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `.theme-apple { ... }` block redefining palette + radius + new shadow/heading tokens.

- [ ] **Step 1: Create themes.css with the core Apple palette**

Create `app/themes.css`:

```css
/* Apple Clean theme. Paper & Ink keeps the :root defaults from globals.css;
   nothing here touches :root, so the default look is unchanged. */

.theme-apple {
  --ink: #1d1d1f;
  --ink-soft: #424245;
  --muted: #6e6e73;
  --line: #e5e5e7;
  --line-strong: #d2d2d7;
  --paper: #ffffff;
  --paper-raised: #ffffff;
  --soft: #f5f5f7;
  --red: #0071e3;
  --red-soft: #ecf4ff;
  --green: #1d8a4e;
  --orange: #b25000;
  --focus: #0071e3;
  --radius: 12px;

  /* shadcn oklch tokens → cool neutral surfaces + blue primary */
  --background: oklch(1 0 0);
  --foreground: oklch(0.21 0.01 265);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.21 0.01 265);
  --primary: oklch(0.58 0.16 250);
  --primary-foreground: oklch(0.99 0 0);
  --border: oklch(0.92 0.004 265);
  --input: oklch(0.92 0.004 265);
  --ring: oklch(0.58 0.16 250);

  /* Apple-only tokens consumed by rules below */
  --shadow-card: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06);
  --shadow-raised: 0 4px 16px rgba(0,0,0,0.08), 0 24px 48px rgba(0,0,0,0.10);
  --heading-font: var(--font-sans), "SF Pro Display", -apple-system, "Segoe UI", sans-serif;
}

/* App-wide background flips from warm cream to Apple's cool gray. */
.theme-apple body {
  background: #f5f5f7;
}
```

- [ ] **Step 2: Import themes.css after the existing stylesheets**

Modify `app/layout.tsx` — add after the two existing CSS imports (order matters; themes.css must win):

```tsx
import "./globals.css";
import "./workspace.css";
import "./themes.css";
```

- [ ] **Step 3: Verify the flip**

Run: `npm run dev`. In console: `localStorage.setItem("plm-theme","apple")`, reload.
Expected: backgrounds turn white/cool-gray, borders lighten, any red accent turns blue across pages. Set back to `paper` → original warm look returns exactly.

- [ ] **Step 4: Commit**

```bash
git add app/themes.css app/layout.tsx
git commit -m "feat(theme): add Apple Clean core variable layer"
```

### Task 2.2: Typography restyle (serif → clean sans)

**Files:**
- Modify: `app/themes.css`

- [ ] **Step 1: Add heading typography overrides**

Append to `app/themes.css` — these target every serif heading rule found in `globals.css`:

```css
/* Serif display headings → tight Apple-style sans. */
.theme-apple .screen-heading h1,
.theme-apple .manual-heading h1,
.theme-apple .resolve-main h2,
.theme-apple .manual-section h2,
.theme-apple .supplier-grid h2,
.theme-apple .sku-grid h2,
.theme-apple .stat strong,
.theme-apple .summary-stats .stat strong {
  font-family: var(--heading-font);
  letter-spacing: -0.02em;
  font-weight: 600;
}

.theme-apple .screen-heading h1,
.theme-apple .manual-heading h1 {
  font-size: 42px;
  line-height: 1.06;
  color: #1d1d1f;
}
```

- [ ] **Step 2: Verify**

Run: app in `apple` theme; open a page with a big heading (e.g. `/styles`) and the dashboard.
Expected: headings render in sans-serif with tight tracking; Paper theme still shows Georgia serif.

- [ ] **Step 3: Commit**

```bash
git add app/themes.css
git commit -m "feat(theme): Apple Clean typography (sans-serif headings)"
```

### Task 2.3: Depth (shadows) + button restyle

**Files:**
- Modify: `app/themes.css`

- [ ] **Step 1: Add shadow + button overrides**

Append to `app/themes.css`:

```css
/* Cards and raised surfaces gain soft diffuse shadows; hairline borders soften. */
.theme-apple .summary-card,
.theme-apple .preflight-card,
.theme-apple .event-log,
.theme-apple .quote-stats,
.theme-apple .approval-readiness,
.theme-apple .header-popover,
.theme-apple .package-list,
.theme-apple .batch-list {
  box-shadow: var(--shadow-card);
  border-color: transparent;
  background: var(--paper-raised);
}

/* Primary/secondary buttons → Apple blue, rounder, subtle lift. */
.theme-apple .action-buttons .primary {
  background: #0071e3;
  border-color: #0071e3;
  border-radius: 980px;
}
.theme-apple .action-buttons .primary:hover {
  background: #0077ed;
}
.theme-apple .action-buttons .secondary {
  border-color: #0071e3;
  color: #0071e3;
  border-radius: 980px;
}
.theme-apple .action-buttons .secondary:hover {
  background: var(--red-soft);
}
.theme-apple .text-button {
  color: #0071e3;
  border-bottom-color: #9ac7f5;
}
.theme-apple .mode-switch button.selected,
.theme-apple .dashboard-switch button.selected {
  background: #0071e3;
}
```

- [ ] **Step 2: Verify**

Run: app in `apple` theme; open the automation dashboard and a workflow page.
Expected: cards float on soft shadows (no hard hairline boxes), primary buttons are blue pills with a hover lift, mode switches highlight blue. Paper theme unchanged.

- [ ] **Step 3: Commit**

```bash
git add app/themes.css
git commit -m "feat(theme): Apple Clean depth (shadows) and blue buttons"
```

---

## Phase 3 — Theme Toggle Control & Placement

Goal: a reusable `ThemeToggle` in the top bar (compact) and the admin/settings page (labeled), both synced through `useTheme()`.

### Task 3.1: ThemeToggle component

**Files:**
- Create: `app/components/ThemeToggle.tsx`
- Modify: `app/globals.css` (append toggle styles) and `app/themes.css` (Apple variant)

**Interfaces:**
- Consumes: `useTheme()` from `ThemeProvider`; `THEME_LABELS`, `THEMES` from `app/lib/theme.ts`.
- Produces: `<ThemeToggle variant="compact" | "labeled" />` (default `"compact"`).

- [ ] **Step 1: Create the component**

Create `app/components/ThemeToggle.tsx`:

```tsx
"use client";

import { useTheme } from "./ThemeProvider";
import { THEMES, THEME_LABELS } from "@/app/lib/theme";

export function ThemeToggle({
  variant = "compact",
}: {
  variant?: "compact" | "labeled";
}) {
  const { theme, setTheme } = useTheme();

  const control = (
    <div className="theme-switch" role="group" aria-label="Appearance theme">
      {THEMES.map((option) => (
        <button
          key={option}
          type="button"
          className={theme === option ? "selected" : ""}
          aria-pressed={theme === option}
          onClick={() => setTheme(option)}
          title={THEME_LABELS[option]}
        >
          {option === "paper" ? "Paper" : "Apple"}
        </button>
      ))}
    </div>
  );

  if (variant === "labeled") {
    return (
      <div className="theme-switch-row">
        <div className="theme-switch-copy">
          <strong>Appearance</strong>
          <span>Switch between the Paper &amp; Ink and Apple Clean looks.</span>
        </div>
        {control}
      </div>
    );
  }
  return control;
}
```

- [ ] **Step 2: Add base styles (Paper look) to globals.css**

Append to `app/globals.css`:

```css
.theme-switch {
  display: flex;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--paper-raised);
  height: 32px;
}
.theme-switch button {
  border: 0;
  background: transparent;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  color: var(--ink-soft);
}
.theme-switch button + button {
  border-left: 1px solid var(--line);
}
.theme-switch button.selected {
  background: var(--red);
  color: #fff;
}
.theme-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--paper-raised);
}
.theme-switch-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.theme-switch-copy strong { font-size: 13px; }
.theme-switch-copy span { font-size: 11px; color: var(--muted); }
```

- [ ] **Step 3: Add Apple variant to themes.css**

Append to `app/themes.css`:

```css
.theme-apple .theme-switch { border-radius: 980px; }
.theme-apple .theme-switch button.selected { background: #0071e3; }
.theme-apple .theme-switch-row { box-shadow: var(--shadow-card); border-color: transparent; }
```

- [ ] **Step 4: Verify (temporary mount)**

Temporarily render `<ThemeToggle />` at the top of `app/admin/AdminWorkspace.tsx`'s `<main>` and load `/admin` as admin.
Expected: two-segment control; clicking Apple flips the whole page live and persists on reload. Remove the temporary mount after confirming (Task 3.3 adds the real one).

- [ ] **Step 5: Commit**

```bash
git add app/components/ThemeToggle.tsx app/globals.css app/themes.css
git commit -m "feat(theme): add ThemeToggle control with Paper/Apple styles"
```

### Task 3.2: Place compact toggle in the top bar

**Files:**
- Modify: `app/Dashboard.tsx` (the `Header` component, `.top-actions` cluster, around lines 469–493)

**Interfaces:**
- Consumes: `<ThemeToggle variant="compact" />`.

- [ ] **Step 1: Import and insert the toggle**

In `app/Dashboard.tsx`, add the import near the other component imports:

```tsx
import { ThemeToggle } from "./components/ThemeToggle";
```

Then inside `Header`, in the `.top-actions` div, insert the toggle just before the `dashboard-switch` group:

```tsx
<div className="top-actions">
  {/* existing Styles / Full process links + sidebar toggle */}
  <ThemeToggle variant="compact" />
  <div className="dashboard-switch" role="group" aria-label="Switch dashboard">
    {/* unchanged */}
  </div>
  {/* rest unchanged */}
</div>
```

- [ ] **Step 2: Verify**

Run: sign in to any role, view a dashboard.
Expected: the Paper/Apple toggle appears in the top bar and flips the app live; choice persists across reload and navigation.

- [ ] **Step 3: Commit**

```bash
git add app/Dashboard.tsx
git commit -m "feat(theme): add theme toggle to top bar"
```

### Task 3.3: Place labeled toggle in settings (admin)

**Files:**
- Modify: `app/admin/AdminWorkspace.tsx` (inside `<main className="admin-command">`, before `admin-card-grid`, around line 414)

**Interfaces:**
- Consumes: `<ThemeToggle variant="labeled" />`.

- [ ] **Step 1: Import and insert the Appearance section**

In `app/admin/AdminWorkspace.tsx`, add the import:

```tsx
import { ThemeToggle } from "@/app/components/ThemeToggle";
```

Insert as the first child of `<main className="admin-command" ...>`:

```tsx
<main className="admin-command" aria-label="Reference data administration">
  <section className="admin-appearance" aria-label="Appearance">
    <ThemeToggle variant="labeled" />
  </section>
  {/* existing visibleLists / admin-card-grid ... */}
```

- [ ] **Step 2: Verify both toggles stay in sync**

Run: as admin, open `/admin`.
Expected: the Appearance row shows the labeled toggle. Changing it updates the app and the top-bar toggle reflects the same value (both read `useTheme()`); reload persists it.

- [ ] **Step 3: Commit**

```bash
git add app/admin/AdminWorkspace.tsx
git commit -m "feat(theme): add Appearance setting to admin page"
```

---

## Phase 4 — Apple Layout Restructures & Verification

Goal: the three chosen surfaces get airier Apple layouts under `.theme-apple` (Paper unchanged), then a full manual verification pass.

### Task 4.1: Login / role picker restructure

**Files:**
- Modify: `app/themes.css` (append; targets `.auth-*-v2` classes from `RolePicker.tsx`)

- [ ] **Step 1: Add Apple login layout overrides**

Append to `app/themes.css`:

```css
/* Login / role picker — airier hero + soft-shadow role cards. */
.theme-apple .auth-shell-v2 { background: #f5f5f7; }
.theme-apple .auth-story-copy h1 {
  font-family: var(--heading-font);
  font-size: 52px;
  line-height: 1.05;
  letter-spacing: -0.03em;
  font-weight: 600;
}
.theme-apple .role-option-v2 {
  border: 0;
  border-radius: 18px;
  background: #fff;
  box-shadow: var(--shadow-card);
  padding: 20px 22px;
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.theme-apple .role-option-v2:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-raised);
}
.theme-apple .role-icon-v2 { color: #0071e3; }
.theme-apple .auth-access-head h2 {
  font-family: var(--heading-font);
  letter-spacing: -0.02em;
}
```

- [ ] **Step 2: Verify**

Run: sign out (`/`), Apple theme active.
Expected: login shows a large tight hero headline and role options as floating rounded cards that lift on hover. Paper theme = original login.

- [ ] **Step 3: Commit**

```bash
git add app/themes.css
git commit -m "feat(theme): Apple Clean login/role-picker layout"
```

### Task 4.2: Dashboard headers & summary cards restructure

**Files:**
- Modify: `app/themes.css` (append; targets `.merged-heading`, `.screen-heading`, `.summary-card`, `.mapping-stats`, `.stat`)

- [ ] **Step 1: Add Apple dashboard layout overrides**

Append to `app/themes.css`:

```css
/* Dashboard headings & summary cards — more air, card grids on soft shadows. */
.theme-apple .merged-heading { padding-bottom: 22px; }
.theme-apple .merged-heading h1,
.theme-apple .screen-heading h1 {
  font-size: 40px;
  letter-spacing: -0.02em;
}
.theme-apple .summary-card {
  border-radius: 16px;
  padding: 18px;
}
.theme-apple .mapping-stats {
  border: 0;
  gap: 12px;
  height: auto;
  padding: 6px 0;
}
.theme-apple .mapping-stats .stat {
  border: 0;
  border-radius: 14px;
  background: var(--paper-raised);
  box-shadow: var(--shadow-card);
  padding: 16px 12px;
}
```

- [ ] **Step 2: Verify**

Run: automation dashboard, Apple theme.
Expected: heading is larger with more breathing room; stat blocks become individual rounded shadowed tiles; summary cards rounder. Paper unchanged.

- [ ] **Step 3: Commit**

```bash
git add app/themes.css
git commit -m "feat(theme): Apple Clean dashboard headers and cards"
```

### Task 4.3: Record list pages restructure

**Files:**
- Modify: `app/themes.css` (append; targets `.table-wrap`, `RecordCardGrid` classes, list headings)

**Interfaces:**
- Consumes: existing class names. First confirm the grid class name in `app/components/RecordCardGrid.tsx` (grep for `className=`), and use the actual class in the selectors below (shown here as `.record-card-grid` / `.record-card` — replace with the real names if they differ).

- [ ] **Step 1: Confirm class names**

Run: `grep -n "className" app/components/RecordCardGrid.tsx`
Expected: note the real grid/card class names; substitute them into Step 2.

- [ ] **Step 2: Add Apple list-page overrides**

Append to `app/themes.css` (adjust the record-card selectors to the names found in Step 1):

```css
/* Record list pages — roomier tables and cards. */
.theme-apple .table-wrap {
  border: 0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}
.theme-apple .table-wrap th,
.theme-apple table th {
  border-bottom: 1px solid var(--line);
  padding: 10px 12px;
}
.theme-apple .table-wrap td,
.theme-apple table td {
  padding: 9px 12px;
  border-bottom: 1px solid var(--line);
}
.theme-apple .table-wrap tbody tr:hover,
.theme-apple .review-columns tbody tr:hover,
.theme-apple .event-log tbody tr:hover {
  background: var(--red-soft);
}
/* Replace .record-card* with the real class names from Step 1 if different. */
.theme-apple .record-card {
  border: 0;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-card);
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.theme-apple .record-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-raised);
}
```

- [ ] **Step 3: Verify**

Run: open `/styles`, `/boms`, `/purchase-orders` in Apple theme.
Expected: tables are rounded shadowed panels with roomier rows and blue hover; record cards float and lift. Paper theme unchanged.

- [ ] **Step 4: Commit**

```bash
git add app/themes.css
git commit -m "feat(theme): Apple Clean record list pages"
```

### Task 4.4: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Regression — Paper theme unchanged**

Run: with `plm-theme=paper` (or cleared), walk login → a dashboard → `/styles` → a workflow page.
Expected: identical to pre-change appearance.

- [ ] **Step 2: Apple theme across surfaces**

Run: flip to Apple; walk the same path plus `/boms`, `/purchase-orders`, `/admin`.
Expected: white/cool-gray surfaces, blue accents, sans headings, soft shadows; restructured login/dashboard/list layouts; no broken/overflowing layouts.

- [ ] **Step 3: Persistence + no-flash**

Run: set Apple, hard-reload several pages.
Expected: stays Apple, no flash of Paper on load.

- [ ] **Step 4: Toggle sync + a11y**

Run: change theme in top bar and in `/admin`; keyboard-tab to the toggle and activate with Enter/Space.
Expected: both toggles reflect the same value; toggle is keyboard-operable; focus ring visible in both themes.

- [ ] **Step 5: localStorage-disabled resilience**

Run: DevTools → block storage (or private window), load app.
Expected: app loads in Paper without errors.

- [ ] **Step 6: Build check**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 7: Final commit (if any verification fixes were made)**

```bash
git add -A
git commit -m "test(theme): verification pass fixes for dual-theme system"
```

---

## Self-Review Notes

- **Spec coverage:** infrastructure (P1), core variable layer + typography/depth/buttons restyle (P2), toggle in both locations (P3), three restructures + verification (P4). All spec sections mapped.
- **Type consistency:** `Theme`, `THEME_STORAGE_KEY`, `normalizeTheme`, `themeClass`, `THEME_LABELS`, `THEMES` defined in Task 1.1 and consumed consistently in 1.2 / 3.1. `useTheme()` shape identical everywhere.
- **Known adjustment point:** Task 4.3 record-card selectors are confirmed against real class names in Step 1 before use (flagged, not a placeholder).
