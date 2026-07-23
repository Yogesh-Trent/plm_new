# Phase 3 — Record workflows and hardening

Status: in progress.

## Objective

Migrate dense product records to validated, accessible forms with stable record
context, explicit save state, safe destructive actions, and protection against
lost work. Retire prototype code only after route-by-route parity.

## Form and component foundation

Phase 3 standardizes on a small production stack:

- React Hook Form for focused field registration and efficient form state;
- Zod with `@hookform/resolvers` for shared typed validation;
- Radix Alert Dialog for accessible confirmations and focus restoration;
- Sonner for consistent non-blocking success and failure feedback;
- existing Phosphor icons and Threadline design tokens for visual continuity.

These libraries support the current Next.js and React versions and do not
replace server-side validation or permissions.

## Opening slice — implemented

- Added a shared Phase 3 record header with back context, record identity,
  ownership context, save state, and action area.
- Migrated the main Style Detail form to React Hook Form and Zod.
- Added on-blur Style name validation with inline, announced correction copy.
- Added explicit saving/saved/unsaved states and a browser unload warning while
  field or image changes are unsaved.
- Replaced Style deletion with an accessible, impact-aware confirmation dialog.
- Added consistent save/delete notifications.
- Preserved all Style Detail child workflows and API payloads.

## Remaining work packages

1. Migrate Colourway and BOM detail forms to the shared record foundation.
2. Migrate technical objects, size/SKU matrices, and sampling.
3. Migrate Supplier Request, Supplier Quote, costing, and approval forms.
4. Migrate PO detail, order splits, routing, issue, and inspections.
5. Add dependency-aware Admin deletion impact where the backend can expose it.
6. Add internal navigation guards for unsaved changes in addition to browser
   unload protection.
7. Complete accessibility, responsive, performance, reliability, and failure-
   recovery audits for every detail route.
8. Delete `Dashboard.tsx`, prototype UI data imports, retired local-state helpers,
   and superseded CSS after final parity sign-off.

## Acceptance criteria

- Long records preserve identity, lifecycle state, and ownership while editing.
- Validation identifies the field, explains the correction, and announces the
  first blocker accessibly.
- Save behavior is explicit and unsaved work cannot disappear silently.
- Approval, routing, and issue actions explain prerequisites and never rely on
  colour alone.
- Destructive record actions show their target and likely downstream impact.
- Every record flow is keyboard-operable and meets WCAG 2.2 AA contrast and
  focus requirements.
- Core detail routes pass mobile, tablet, laptop, and wide-desktop checks.
- No user-facing route renders bundled prototype JSON or local workflow state.
- ESLint, TypeScript, production build, and critical-path tests pass.

## Exit condition

Phase 3 is complete only when every supported detail workflow has parity and
the retired prototype implementation can be deleted without losing a user task.
