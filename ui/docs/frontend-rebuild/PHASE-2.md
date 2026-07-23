# Phase 2 — Operational workspaces

Status: complete.

## Outcome

Every backend-backed operational list now uses the same Threadline page,
toolbar, panel, state, and safe-table system. The phase adds no prototype data
and changes no backend mutation contract.

## Delivered

- Shared `OperationalWorkspace` components for page headers, content frames,
  panels, toolbars, loading/empty/error states, and responsive table regions.
- Migrated Seasons, Styles, Colourways, BOMs, Purchase Orders, and Admin
  reference-data management.
- Added global Supplier Request and Supplier Quote queues using live sourcing
  tables, with links back to their contextual detail records.
- Added shareable URL state for Style assignment (`assigned`), Colourway search
  and pagination (`q`, `page`), Purchase Order routing (`view`), and sourcing
  queue search/state filters (`q`, `state`).
- Added distinct loading, first-use empty, no-result, request-error, and retry
  treatments.
- Added Radix Alert Dialog confirmations for destructive list actions, with
  target-specific impact copy and managed keyboard focus.
- Added Sonner notifications for successful creates, saves, and deletes.
- Added React Hook Form and Zod to the BOM creation flow as the first shared form
  implementation, including on-blur validation and inline announced errors.
- Increased Phase 2 control and mobile action targets to at least 44px.
- Preserved role guards, API routes, payloads, server validation, and record IDs.

## Source-of-truth routes

| Workspace         | Route                | Primary data source  |
| ----------------- | -------------------- | -------------------- |
| Seasons           | `/all/process`       | Seasons API          |
| Styles            | `/styles`            | Styles API           |
| Colourways        | `/color-combos`      | Colourways API       |
| BOM library       | `/boms`              | BOM queries and API  |
| Supplier requests | `/supplier-requests` | Sourcing queries     |
| Supplier quotes   | `/supplier-quotes`   | Sourcing queries     |
| Purchase orders   | `/purchase-orders`   | Supplier PO API      |
| Reference data    | `/admin`             | Admin reference APIs |

## Acceptance result

- Filters that change the visible dataset are represented in the URL.
- Repeated list structure is implemented through shared components.
- Dense data is contained in labelled, horizontally safe table regions.
- Destructive list actions name the target and require confirmation.
- Loading, empty, filtered-empty, error, and retry states are distinct.
- All user-facing operational routes use the shared authenticated shell.
- Backend permissions and validation remain authoritative.
- Formatting, ESLint, TypeScript, production build, and authenticated route
  smoke checks pass.

## Backend-aligned decisions

- Bulk mutation UI was not added because the backend exposes record-level
  mutation contracts only. Inventing bulk behavior would violate the backend-
  only source-of-truth requirement.
- Supplier Requests are created from a Style and Supplier Quotes from a Request,
  preserving their required parent context. The global queues are for finding,
  filtering, and opening existing work.
- Detail-only selectors remain until their Phase 3 record migrations complete;
  removing them during Phase 2 would break live forms.
