# Five-Workspace Style-to-PO Design

## Decision

Use the selected **Fashion Editorial** visual system and reorganize the eight PLM operations into five larger workspaces. This reduces navigation and repeated context without removing any business step.

```text
Workspace 1  Style intake & creation       -> original step 1
Workspace 2  Color & product definition    -> original steps 2–3
Workspace 3  Supplier commercial           -> original steps 4–5
Workspace 4  SKU & PO planning              -> original steps 6–7
Workspace 5  Approval & issue               -> original step 8
```

The five-workspace rail is the main navigation. A secondary eight-operation progress strip remains visible so automation operators can map the new experience back to Centric PLM and diagnose failures precisely.

## Why five workspaces are stronger

### Preserve the user's mental model

The user thinks in outcomes: define the style, define the product, commercialize with a supplier, build the order, then approve and issue. Centric PLM exposes many database objects, but those objects do not need separate top-level pages.

### Keep related objects together

- Color Combo and BOM belong together because `Add to BOM`, color applicability and main material are one product-definition decision.
- Supplier Request and Supplier Quote belong together because the request creates the quote shell and the quote completes the commercial response.
- SKU generation and Supplier PO belong together because the color-size matrix, ratio, cost and order dates must reconcile before an order can exist.

### Show automation as a controlled run

Each workspace has four states:

1. `Waiting for source`
2. `Ready to run`
3. `Running`
4. `Complete`, `Warning`, or `Blocked`

The user can run one operation, run the whole workspace, or resume from the first incomplete operation. Create, approve and issue actions require an idempotency check before retry.

## Shared page anatomy

Every workspace uses the selected Fashion Editorial theme:

- warm ivory base;
- ink-black body text;
- restrained oxblood/burgundy primary accent;
- copper/terracotta warning accent;
- sage success state;
- editorial serif page title with modern sans-serif product text;
- hairline dividers, 6px radii and minimal shadow;
- operational desktop density at 1440 × 1024.

Every workspace includes:

- five-workspace rail;
- eight-operation progress strip;
- Zudio AW26 source-row context;
- `Source data` drawer with exact Excel values;
- readiness summary separating blockers from warnings;
- `Run workspace` or outcome-specific primary action;
- activity/audit link;
- last-saved and PLM synchronization state.

## Workspace 1 — Style intake & creation

### Outcome

A unique PLM style exists under the correct hierarchy, with image, size range, MATKL and description data ready for product definition.

### Main experience

- Excel source row preview and missing-field detection.
- Hierarchy resolver for Season, Department, Brand/Division and Product Type.
- Style Type and Template resolver.
- Style Name, image and description section.
- Size-range selector supporting numeric and alpha sizes.
- MATKL Description 3 and Generic fields.
- Duplicate-style search before create.
- Live creation log showing generated Style ID and Style Code.

### Automation sequence

1. Validate the source row.
2. Resolve hierarchy master data.
3. Search for an existing exact style.
4. Create only when no exact style exists.
5. Reopen the style and update properties.
6. Verify size range and required values.
7. Persist object IDs and completion state.

### Primary action

`Create style & continue`

### Important blockers

- Missing Department, Brand/Division, Product Type, Style Type, Template or Style Name.
- Ambiguous master-data result.
- Duplicate Style Name in the same hierarchy.
- Invalid or empty Size Range.

## Workspace 2 — Color & product definition

### Outcome

The color combo exists with active PLM enum values, and the Style BOM contains the correct main fabric.

### Main experience

The page is split into two synchronized task areas:

1. **Color definition** — Color Combo, Colorway Selection, Pantone, Add to BOM, Strategy, Buy Type, Fit Type, Story Name, Garment Design/Length, Store Grade, Fixture Type, DROP, Month and MRP.
2. **BOM definition** — Style BOM, color applicability, Fabrics section, Full Body placement, material search, UOM, quantity and Main Material.

### Automation sequence

1. Create or find the Color Combo.
2. Resolve every enum against active PLM keys.
3. Save text and number fields separately from enum actions.
4. Refresh and verify returned values.
5. Open the Style BOM.
6. Select `Fabrics > Full Body`.
7. Place material `FKn01144`.
8. Set Main Material true.
9. Verify trims and packaging remain intact.

### Primary action

`Save product definition`

### Important blockers

- Inactive or unresolved enum.
- Color Combo duplicate.
- Main material selected under the wrong BOM section.
- Material not found or ambiguous.
- Add to BOM is false.

## Workspace 3 — Supplier commercial

### Outcome

A supplier request is created for the correct vendor, the generated supplier quote contains the approved commercial/classification data, and the quote is ready for SKU use.

### Main experience

- Vendor identity card with Supplier ID, Vendor Name and Vendor Type.
- Supplier Request Template and data-package selection.
- Attached style/BOM/technical-package checklist.
- Supplier Request lifecycle timeline.
- Supplier Quote commercial form: BOM, supplier code mapping, cost/CMP, MRP, HSN, currency and Article Freight Group.
- Cost-to-MRP and margin summary.
- Approval readiness and quote state.

### Automation sequence

1. Create or find the Supplier Request.
2. Attach the style, BOM and data package.
3. Save and open the request.
4. Find the generated Supplier Quote.
5. Map the confirmed supplier-code field.
6. Set BOM, cost ₹100, MRP ₹999, HSN 62033300 and freight group.
7. Validate currency, vendor and classification.
8. Approve the quote.
9. Persist request and quote IDs.

### Primary action

`Approve supplier quote`

### Important blockers

- Supplier code field mapping is unconfirmed.
- Vendor is ambiguous or inactive.
- BOM is missing.
- Cost, MRP, HSN or freight group fails validation.
- Quote state is not eligible for approval.

## Workspace 4 — SKU & PO planning

### Outcome

Every active color-size SKU is enriched with quote, material and quantity ratio; the Supplier PO is created with balanced quantities and valid dates.

### Main experience

- Color × size matrix with active combinations.
- Quantity-ratio template selector and calculated quantities.
- Row, column and grand totals.
- Batch-enrichment checklist for Supplier Quote and Loaded Main Material.
- SKU generation and verification log.
- PO planning panel with supplier, quantity, cost, dates, holiday calendar, critical path and capacity.
- Reconciliation panel: Excel total vs matrix total vs PO total.

### Automation sequence

1. Generate active SKUs using the matrix.
2. Attach the approved quote to every SKU.
3. Apply `ttPOOrderQtyRatio`.
4. Apply `ttLoadedMainMaterial = FKn01144`.
5. Verify SKU completeness.
6. Calculate size quantities from approved ratios because the sample size fields are zero.
7. Create or find the Supplier PO.
8. Add SKUs and quantities.
9. Set Ex-Factory 02 Dec 2026, Shipment 02 Dec 2026 and Launch 17 Dec 2026.
10. Validate quantity, sequence, capacity and mandatory attributes.

### Primary action

`Create PO & validate`

### Important blockers

- No approved size-ratio rule for Total Qty 15,511.
- SKU lacks quote or main material.
- Matrix total does not equal 15,511.
- Same-day Ex-Factory and Shipment is not allowed by policy.
- Supplier capacity is exceeded.

## Workspace 5 — Approval & issue

### Outcome

Reviewers understand the order, all exceptions are resolved, the PO reaches Ready, is issued to the supplier and synchronizes to SAP.

### Main experience

- Executive order summary.
- Preflight checks grouped by Style, Product Definition, Supplier Commercial, SKU/Quantity and PO Dates.
- Approval-route timeline for Merchandiser, Sourcing and Accounts.
- Exception inbox with return-for-change action.
- Document checklist and change links to the responsible workspace.
- Issue confirmation and downstream status.

### Automation sequence

1. Re-run all cross-workspace validations.
2. Send to Merchandiser.
3. Route to Sourcing and Accounts according to policy.
4. Capture every approval or return reason.
5. Move to Ready only when required approvals pass.
6. Issue the Supplier PO.
7. Generate PO PDF and send to supplier.
8. Monitor SAP synchronization and store the SAP PO number.

### Primary action

`Issue supplier PO`

### Important blockers

- Any upstream workspace is stale or blocked.
- Approval route is incomplete.
- Quantity, dates, capacity or mandatory attributes fail.
- SAP preconditions are missing.

## Cross-workspace rules

### Data inheritance

- Workspace 1 hierarchy populates every downstream object.
- Workspace 2 color and size data generate the SKU matrix.
- Workspace 2 BOM automatically attaches to the Supplier Request and Quote.
- Workspace 3 approved Quote automatically propagates to every SKU and PO line.
- Workspace 4 matrix total becomes the PO total.
- Workspace 5 displays source values and calculated values side by side.

### Stale-data policy

| Upstream change | Downstream effect |
| --- | --- |
| Hierarchy, Style Type or Template | Revalidate all workspaces |
| Color or active sizes | Regenerate SKUs and quantity matrix |
| Main material | Revalidate quote cost, SKU material and PO |
| Vendor | Recreate request/quote and revalidate PO |
| Cost, MRP or HSN | Reapprove quote and PO |
| Quantity ratio | Recalculate SKU and PO totals |
| Dates or critical path | Revalidate approval and issue readiness |

### Safe retry policy

- Read and search operations may retry automatically.
- Create operations must run a find-before-create idempotency check.
- Approve, Ready and Issue transitions must check the current state before retry.
- A partial workspace resumes from the first incomplete operation.
- The UI names the PLM object and operation that failed; it does not show a generic error only.

## Selected visual system

The selected visual target is:

[`theme-fashion-editorial.png`](theme-exploration-v2/theme-fashion-editorial.png)

The five generated screens must preserve its warm ivory canvas, oxblood active state, restrained copper warnings, sage validation, serif page title, sans-serif controls, fine dividers, compact form density and right-side source-data treatment.

## Generated five-workspace screens

1. [Style intake & creation](fashion-editorial-process-v3/01-style-intake.png)
2. [Color & BOM](fashion-editorial-process-v3/02-color-bom.png)
3. [Supplier commercial](fashion-editorial-process-v3/03-supplier-commercial.png)
4. [SKU & PO planning](fashion-editorial-process-v3/04-sku-po-planning.png)
5. [Approval & issue](fashion-editorial-process-v3/05-approval-issue.png)
