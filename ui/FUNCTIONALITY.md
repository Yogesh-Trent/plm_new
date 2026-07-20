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

## Page structure

Each workspace is presented as **three merged pages** (one per workflow group), not six single-phase pages. Every page renders both of its steps in one cohesive workspace: a single group heading, both steps' sections stacked under labelled step markers, one combined right context panel holding both steps' values and utility actions, one shared slim status footer, and one primary Continue. Each sidebar lists the three groups with no sub-steps; selecting a group opens its single page.

## Automation run

Three pages. Actions live in the combined right context panel; a single primary Continue advances to the next page.

1. Map source & plan run (Import & map + Plan & simulate): resolve replacement-source fields, approve the ratio, export mappings, review the dry-run plan, approve the run plan, then continue to run & recover.
2. Execute run & recover safely (Execute & monitor + Resolve & recover): animated progress with safe pause/resume and downloadable event log, selectable exceptions with searchable active PLM values and saved recovery note, then continue to review & issue.
3. Review record & issue PO (Final review & correction + Approval & issue): source-to-PLM comparison with inline correction, suggested fixes, live validation and audit export, sequential approval route, downloadable audit, and issued supplier-PO confirmation.

## Manual process

Three pages; Automation’s eight-operation strip and automation-specific activity labels are not rendered.

1. Style, colour & BOM (Style intake + Color & BOM): editable required hierarchy and size-range fields with live blocker count, colour/BOM definition fields and working BOM toggles, draft persistence and export, then a gated Save product & continue.
2. Supplier commercial & PO planning (Supplier commercial + SKU & PO planning): editable supplier-code mapping and quote drafts, editable ratio/calendar/critical-path fields with calculated ratio quantities totalling 15,511 and reconciliation, then a gated Create PO & continue.
3. Final review & approval issue (Final review & correction + Approval & issue): consolidated review with Manual edit mode enabled by default that unlocks the approval route, upstream completion checks, sequential approvals with saved state, audit export, and issued supplier-PO confirmation.

Manual Save, Continue, Validate, and Approve controls stay in the combined right context panel. Validation feedback uses the shared slim bottom status line.

Missing source markers remain in prototype validation data but render as blank controls/cells. Right context panels are phase-scoped and omit unfilled values and fields belonging to other processes.

Manual Final review uses operator language and shows only checked-value status, the filled record, the next approval step, and Manual review actions. Automation-only audit preview and run metadata are not rendered in Manual mode.

## Verification

- Every rendered `<button>` has an action handler.
- ESLint passes with no errors or warnings.
- Next.js production build and TypeScript checks pass.
- Production server responds successfully and includes both process modes.
