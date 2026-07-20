# Prototype functionality

The application is a client-side prototype with no authentication or backend. State is stored in browser `localStorage`, and exports are generated as downloadable JSON files.

## Shared controls

- Switch between Automation run and Manual process.
- Switch between two complete dashboards from the navbar: Automation / Controlled run and Manual / Operator-led.
- Navigate each dashboard from its own sidebar with independent phase progress and status.
- Use the icon-only Robot / Hand dashboard selector; its animated selection surface identifies the current dashboard.
- Collapse or restore the sidebar from the navbar. The preference persists after reload, and collapsed desktop navigation retains phase buttons.
- Save the current workspace, export all prototype JSON, or reset all prototype state from the run menu.
- Open notifications, help, and profile panels.
- Restore mode, phase, completed manual steps, and editable manual fields after reload.
- Adapt the shared shell for desktop, tablet, and mobile-width screens without removing workflow actions.
- Respect the user’s reduced-motion preference while animating dashboard and sidebar changes.
- Present validation, safety, and release actions in a compact responsive bottom dock with semantic status icons and neutral disabled controls.

## Automation run

Automation actions are placed in the right context panel for every phase. All six phases use the same slim validation/status footer as Manual mode.

1. Import & map: resolve replacement-source fields, approve the ratio, validate, save, and export mappings.
2. Plan & simulate: return to mapping, export the dry-run plan, and approve the plan after mapping validation.
3. Execute & monitor: animated progress, safe pause/resume, downloadable event log, and continuation after completion.
4. Resolve & recover: selectable exceptions, searchable active PLM values, saved recovery note, and fix/resume progression.
5. Final review & correction: complete source-to-PLM field comparison, inline correction, suggested fixes, live validation, local restore, and audit export before approval.
6. Approval & issue: sequential approval route, downloadable audit, and issued supplier-PO confirmation.

## Manual process

Manual mode uses only its five operator-led phases; Automation’s eight-operation strip and automation-specific activity labels are not rendered.

1. Style intake: editable required hierarchy and size-range fields, live blocker count, draft persistence, export, and gated continuation.
2. Color & BOM: editable definition fields, working BOM toggles, live validation, draft persistence, export, and gated continuation.
3. Supplier commercial: editable supplier-code mapping, quote draft persistence, export, and gated approval.
4. SKU & PO planning: editable ratio/calendar/critical-path fields, calculated ratio quantities totaling 15,511, reconciliation, persistence, export, and gated PO validation.
5. Final review & correction: the same consolidated review experience as Automation, with Manual edit mode enabled by default and a gated continuation to approval.
6. Approval & issue: upstream completion checks including final review, sequential approvals, saved approval state, audit export, and issued supplier-PO confirmation.

Manual Save, Continue, Validate, and Approve controls stay in the right source panel. Validation feedback uses the shared slim bottom status line.

Missing source markers remain in prototype validation data but render as blank controls/cells. Right context panels are phase-scoped and omit unfilled values and fields belonging to other processes.

Manual Final review uses operator language and shows only checked-value status, the filled record, the next approval step, and Manual review actions. Automation-only audit preview and run metadata are not rendered in Manual mode.

## Verification

- Every rendered `<button>` has an action handler.
- ESLint passes with no errors or warnings.
- Next.js production build and TypeScript checks pass.
- Production server responds successfully and includes both process modes.
