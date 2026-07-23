# Frontend rebuild roadmap

## Why the rebuild is phased

The product backend already supports the complete PLM domain, but the frontend
grew across a 4,500-line workflow component and a 6,300-line global stylesheet.
Replacing every screen in one pass would make visual regressions and broken
workflows difficult to isolate. The rebuild therefore establishes one system,
migrates repeated operational surfaces, and then completes dense record flows.

The migration does not change database contracts unless a documented UX need
requires it. Backend-backed routes stay usable throughout the migration; the
prototype-only Workflow Studio redirects to the live role overview.

## Product direction

The interface is an editorial operations workspace rather than a generic SaaS
template.

- A dark ink navigation rail anchors the product.
- Warm paper surfaces suit fashion product work without reducing data clarity.
- Verdigris is the single interaction accent; rust is reserved for attention.
- Georgia provides an editorial display voice; the system UI stack keeps dense
  product data readable and fast.
- Borders and spacing create hierarchy. Shadows and rounded containers are used
  sparingly.
- Phosphor is the only icon family.
- Tables, empty states, loading states, errors, keyboard focus, and reduced
  motion are first-class states.

## The three phases

### Phase 1 — Foundation and command centres

Establish the design language and the everyday entry point for each role.

Deliverables:

- redesigned role-selection experience;
- responsive shared application shell and navigation;
- role-aware dashboard using live seasons, styles, colourways, BOMs, POs, run,
  and audit data;
- decision queue, recent records, process route, and clear primary actions;
- legacy automation/manual workflow removed from product navigation because it
  uses prototype JSON and browser-local state rather than the backend;
- semantic tokens and isolated Phase 1 styles;
- responsive, focus-visible, reduced-motion, empty, and signed-out states.

See [PHASE-1.md](PHASE-1.md).

### Phase 2 — Operational workspaces

Status: complete. The high-frequency list and management surfaces now share one
backend-backed operational component system.

Deliverables:

- seasons, styles, colourways, BOMs, supplier work, and purchase-order lists;
- consistent page headers, filters, saved views, pagination, and row actions;
- reusable table, filter bar, status, confirmation, toast, loading, empty, and
  error-state components;
- URL-backed filtering and pagination where data volume warrants it;
- role-aware navigation and permissions on every migrated page;
- removal of duplicated list-page CSS and local one-off patterns.

See [PHASE-2.md](PHASE-2.md).

### Phase 3 — Record workflows and hardening

Status: in progress. Complete the migration of dense forms and end-to-end
workflows, then remove the retired prototype implementation.

Deliverables:

- style, colourway, BOM, supplier request, quote, PO, inspection, and admin
  detail experiences;
- progressive disclosure for long forms, sticky record context, autosave where
  safe, unsaved-change protection, and actionable validation;
- complete loading, empty, error, optimistic, and permission-denied states;
- WCAG 2.2 AA review, keyboard-only review, responsive review, and reduced-motion
  review;
- bundle and render profiling, route-level code splitting, and image strategy;
- removal of the legacy dashboard, obsolete selectors, and dead frontend code.

See [PHASE-3.md](PHASE-3.md).

## Definition of done for the rebuild

- Every supported backend workflow has a responsive frontend route.
- Users can identify their current role, record, state, and next action without
  relying on colour alone.
- No essential action is hover-only or icon-only without an accessible name.
- Data surfaces include loading, empty, and recoverable error states.
- The design uses the documented tokens and one icon family.
- ESLint, TypeScript, and the production build pass.
- The legacy dashboard and superseded CSS are removed only after feature parity.
