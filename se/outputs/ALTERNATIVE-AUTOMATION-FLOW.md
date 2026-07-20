# Alternative Five-Screen Automation Flow

## Concept

This alternative keeps the selected Fashion Editorial visual theme but changes the product model completely. Instead of navigating through PLM objects, the user manages one controlled automation run.

```text
1. Import & map
2. Plan & simulate
3. Execute & monitor
4. Resolve & recover
5. Review & release
```

All original PLM operations remain visible inside the run:

```text
Style -> Color -> BOM -> Supplier request -> Quote/code -> SKUs -> Supplier PO -> Issue
```

## Screen 1 — Import & map

Purpose: load the Excel row, map every source column to its PLM target, resolve master data, and expose missing values before any write occurs.

Key areas:

- uploaded source row and data-health score;
- source-to-PLM field mapping table;
- hierarchy and enum resolution results;
- exact, ambiguous, missing and derived value states;
- ratio-policy requirement caused by zero size quantities;
- preview of the eight operations that will be created.

Primary action: `Validate mapping`.

## Screen 2 — Plan & simulate

Purpose: show the complete dependency graph and simulate the run without changing PLM.

Key areas:

- eight-operation dependency timeline;
- create-or-find decisions for every PLM object;
- values inherited between objects;
- planned API calls and approval transitions;
- dry-run result with blockers, warnings and expected object IDs;
- rollback boundary and safe retry policy.

Primary action: `Approve run plan`.

## Screen 3 — Execute & monitor

Purpose: execute the approved plan and show live progress across all eight operations.

Key areas:

- overall run progress and elapsed time;
- operation timeline with running, completed, blocked and waiting states;
- current API action and target PLM object;
- generated IDs and state transitions;
- live structured event log;
- pause-after-current-action and safe stop controls.

Primary action: `Continue run` or `Pause after current action` depending on state.

## Screen 4 — Resolve & recover

Purpose: repair only the failed data or operation, understand downstream impact, and resume safely.

Key areas:

- exception inbox grouped by source, master data, validation and PLM API;
- focused repair drawer for the selected exception;
- active enum resolver and master-data disambiguation;
- stale downstream object map;
- retry preview showing which operations will rerun;
- audit comparison between original and corrected values.

Primary action: `Apply fix & resume`.

## Screen 5 — Review & release

Purpose: reconcile source, calculated and PLM values; complete role approvals; issue the PO; and monitor downstream delivery.

Key areas:

- final object inventory with IDs and states;
- source-vs-PLM reconciliation;
- quantity, price, material, supplier and date checks;
- Merchandiser, Sourcing and Accounts route;
- issue readiness and signed audit summary;
- PO PDF, supplier delivery and SAP synchronization.

Primary action: `Issue supplier PO`.

## Why this model is different

- The first design is **business-workspace centric**: users work on Style, Color/BOM, Supplier, SKU/PO and Approval outcomes.
- This design is **automation-run centric**: users prepare, simulate, execute, repair and release one traceable run.
- The run-centric model is better for automation operators, support teams and high-volume batch processing.
- The business-workspace model is better for merchandisers and technologists who edit product data manually.

## Shared rules

- No PLM write occurs before mapping and simulation pass.
- Every create action performs find-before-create.
- Every transition checks current state before retry.
- Any upstream correction names all stale downstream operations.
- The user can resume from the first incomplete operation.
- Exact supplied values remain visible throughout the run.
- Missing source values are never silently invented.

## Generated screens

1. [Import & map](fashion-editorial-automation-v4/01-import-map.png)
2. [Plan & simulate](fashion-editorial-automation-v4/02-plan-simulate.png)
3. [Execute & monitor](fashion-editorial-automation-v4/03-execute-monitor.png)
4. [Resolve & recover](fashion-editorial-automation-v4/04-resolve-recover.png)
5. [Review & release](fashion-editorial-automation-v4/05-review-release.png)
