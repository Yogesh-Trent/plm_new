# Phase 1 — Foundation and command centres

Status: implemented in the current worktree.

## Scope

Phase 1 changes the product entry point without rewriting backend contracts.
It introduces the shared visual and navigation foundation that later phases
must reuse, then applies that shell to every current backend-backed route.

## Implemented

- `app/workspace.css` defines namespaced tokens, layouts, interaction states,
  breakpoints, focus treatment, and reduced-motion behavior.
- `app/RolePicker.tsx` provides a clearer role choice with role purpose,
  progress feedback, and useful error messaging.
- `app/components/WorkspaceShell.tsx` provides the desktop rail, mobile drawer,
  sticky top bar, active navigation, live-data cue, user menu, and sign out.
- `app/components/RoleHome.tsx` reads live data server-side and presents role
  focus, collection metrics, recent styles, decision queue, workflow progress,
  and run audit activity.
- `app/loading.tsx` and `app/error.tsx` provide an immediate loading surface and
  a recoverable failure path without risking saved work.
- `/designer`, `/buyer`, `/technologist`, and `/all` open the command centre.
- Every backend-backed list and detail route is presented inside the shared
  shell while deeper component refactors remain phased.
- The prototype/manual Workflow Studio is removed from navigation; its old
  routes redirect to the role overview because it does not use live PLM data.

## Acceptance criteria

- Dashboard numbers come from database query modules, not placeholder JSON.
- A role can reach all current backend-backed modules from one navigation rail.
- Navigation is operable on desktop and mobile.
- The main content has one `h1`, useful landmarks, and a skip link.
- Keyboard focus is visible and custom motion respects reduced-motion settings.
- Empty data produces a next-action state instead of a blank panel.
- No backend mutation contract is changed.
- ESLint and a production build pass.

## Explicitly deferred

- Full list-page component extraction, URL-backed filters, and saved views remain
  in Phase 2.
- Long-form detail restructuring, autosave, and unsaved-change protection remain
  in Phase 3.
- The unused legacy `Dashboard.tsx` implementation remains in source until its
  dead CSS and supporting assets can be removed safely in Phase 3.
