# Prototype functionality

The application is a client-side prototype with no authentication or backend. State is stored in browser `localStorage`, and exports are generated as downloadable JSON files.

## Shared controls

- Switch between Automation run and Manual process.
- Save the current workspace, export all prototype JSON, or reset all prototype state from the run menu.
- Open notifications, help, and profile panels.
- Restore mode, phase, completed manual steps, and editable manual fields after reload.

## Automation run

1. Import & map: resolve replacement-source fields, approve the ratio, validate, save, and export mappings.
2. Plan & simulate: return to mapping, export the dry-run plan, and approve the plan after mapping validation.
3. Execute & monitor: animated progress, safe pause/resume, downloadable event log, and continuation after completion.
4. Resolve & recover: selectable exceptions, searchable active PLM values, saved recovery note, and fix/resume progression.
5. Review & release: sequential approval route, downloadable audit, and issued supplier-PO confirmation.

## Manual process

1. Style intake: editable required hierarchy and size-range fields, live blocker count, draft persistence, export, and gated continuation.
2. Color & BOM: editable definition fields, working BOM toggles, live validation, draft persistence, export, and gated continuation.
3. Supplier commercial: editable supplier-code mapping, quote draft persistence, export, and gated approval.
4. SKU & PO planning: editable ratio/calendar/critical-path fields, calculated ratio quantities totaling 15,511, reconciliation, persistence, export, and gated PO validation.
5. Approval & issue: upstream completion checks, sequential approvals, saved approval state, audit export, and issued supplier-PO confirmation.

## Verification

- Every rendered `<button>` has an action handler.
- ESLint passes with no errors or warnings.
- Next.js production build and TypeScript checks pass.
- Production server responds successfully and includes both process modes.
