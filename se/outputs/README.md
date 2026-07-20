# Centric PLM Style-to-PO Workflow

## Purpose

This document defines the complete Centric PLM process to automate one Excel row from style creation through an issued supplier purchase order.

The workflow is intentionally shown as **eight business steps**. Every UI theme and later prototype must keep all eight steps visible so the user always knows what is complete, what is active, and what is blocked.

## End-to-end process

```text
1. Style creation
   -> 2. Create color combo
   -> 3. Create BOM
   -> 4. Create supplier request
   -> 5. Update and approve supplier quote/code
   -> 6. Generate and enrich SKUs
   -> 7. Create supplier PO
   -> 8. Validate, approve and issue PO
```

### Persistent workflow context

Every screen must show:

- Season
- Department
- Brand / Division
- Product Type
- Style Name and generated Style Code
- Current workflow step and overall status
- Source Excel row identifier
- Last save / synchronization state
- Blocking errors and warnings

The user may return to a completed step. An upstream change must mark affected downstream steps as stale and explain what must be revalidated.

## Step 1 — Style creation

### Goal

Create the style under the correct season hierarchy and complete its core properties.

### PLM navigation represented by this step

1. Select the season.
2. Select the department, such as Menswear.
3. Open `Style` and select `New Style`.
4. In hierarchy details, confirm the prefilled Season and Department.
5. Select Brand / Division through the searchable dialog.
6. Select Product Type through the searchable dialog.
7. Continue to style details.
8. Select Style Type.
9. Select Template.
10. Enter Style Name and finish creation.
11. Reopen the created style by Style Name.
12. Confirm the Size Range and selected sizes.
13. Update `MATKL Description 3`.
14. Add the product image when supplied.

### Source fields

- `Season`
- `create_new_style`
- `Image`
- `Department` — required in the automation input even though it is missing from the supplied sample headers
- `Brand/Division`
- `Product_Type`
- `Style_Type`
- `Template`
- `Style_Name`
- `Size_Range`
- Numeric sizes: `28/XS`, `30/S`, `32/M`, `34/L`, `36/XL`, `38/XXL`
- Alpha sizes: `XS`, `S`, `M`, `L`, `XL`, `XXL`
- `MATKL_Description_3`
- `description_code`
- `Description`
- `Generic`

### Completion criteria

- Style exists exactly once.
- Generated Style Code is stored.
- Hierarchy values match the Excel row.
- Correct style template is applied.
- Size range and active sizes are valid.
- `MATKL Description 3` is saved.
- Required image is attached or explicitly marked not required.

## Step 2 — Create color combo

### Goal

Create the style colorway and fill every required colorway attribute with active PLM enum values.

### Actions

1. Open the style's `Color Combos` tab.
2. Select `New Color Combo`.
3. Set Color Combo and Colorway Selection.
4. Set Pantone Color Code when supplied.
5. Enable `Add to BOM`.
6. Save the color combo.
7. Reopen it and update the required attributes.
8. Refresh the view and verify saved values.

### Colorway attributes

- `Colorway_Selection`
- `Pantone_Color_Code`
- `DROP`
- `month`
- `Strategy`
- `fit_type`
- `Story_name`
- `Buy_type`
- `Fixture name`
- `Garment_design`
- `Garment_length`
- `Store_grade`
- `Colour`
- `Existing_New`
- `MRP`

### Enum safety rule

Enum values must be resolved case-insensitively against active PLM enum keys. Never send unchecked Excel text directly to `ActionEnum`. Live PLM lookup is preferred; the curated static map is the fallback. If no active match exists, stop this step and show a field-specific error.

### Completion criteria

- Color combo exists exactly once.
- `Add to BOM` is true.
- All mandatory colorway attributes resolve to active enum values.
- MRP is numeric and greater than zero.
- No inactive or display-name-as-key enum is submitted.

## Step 3 — Create BOM

### Goal

Attach the correct main fabric to the style BOM and preserve template-provided trims and packaging.

### Actions

1. Open `Specification > BOM`.
2. Open the Style BOM.
3. Go to `Placements`.
4. Expand the `Fabrics` section.
5. Select the `Full Body` row inside Fabrics—not the Full Body row under Trims or Packaging.
6. Search the Product cell using `Material_Code`.
7. Select the exact material result.
8. Enable `Main Material` on that fabric row.
9. Verify UOM and quantities.

### Source fields

- `Material_Code`
- `MATKL_Description_3`
- `Colour`
- Active size columns when BOM quantity differs by size

### Completion criteria

- One active Style BOM is linked to the color combo.
- The fabric is placed under `Fabrics > Full Body`.
- Material code matches the Excel row.
- Main Material is true.
- Standard trims and packaging remain attached unless explicitly overridden.

## Step 4 — Create supplier request

### Goal

Create a supplier request for the style and generate its supplier quote shell.

### Actions

1. Open `Sourcing > Supplier Requests`.
2. Select `New Supplier Request`.
3. Select the vendor using Supplier ID and Vendor Name.
4. Confirm the style.
5. Select the Supplier Request Template.
6. Select the required data package / tech-pack template.
7. Save and go to the supplier request.
8. Confirm the BOM and style package are attached.

### Source fields

- `Supplier_ID`
- `Vendor_Name`
- `Vendor_Type`
- `supplier_request_template`
- `new_supplier_request`

### Completion criteria

- Supplier request exists once for the style/vendor combination.
- Vendor and style are correct.
- Required template is applied.
- BOM and technical data are inherited automatically.
- Supplier quote shell is generated.

## Step 5 — Update and approve supplier quote/code

### Goal

Complete the commercial and classification fields on the generated supplier quote, then approve it for SKU and PO use.

### Actions

1. Open the generated Supplier Quote.
2. Select the Style BOM.
3. Update supplier/vendor code fields required by the business configuration.
4. Set CMP / cost.
5. Set MRP.
6. Set HSN Code.
7. Set Article Freight Group, currently expected as `GAR-XX1` unless the source or business rule provides another value.
8. Validate supplier currency and country when applicable.
9. Select `Actions > Approve`.

### Source fields

- `Supplier_ID`
- `Vendor_Name`
- `Cost`
- `MRP`
- `hsn_code`
- `Vendor_Type`

### Business clarification

The exact PLM field referred to as **supplier code** must be confirmed before automation. Until confirmed, the implementation must display the field mapping and must not silently guess between Supplier ID, vendor code, supplier quote code, or product supplier code.

### Completion criteria

- Supplier quote is linked to the correct BOM.
- Supplier identity/code fields are saved.
- Cost, MRP, HSN and freight group are valid.
- Quote state is Approved.

## Step 6 — Generate and enrich SKUs

### Goal

Generate the active color-by-size SKUs and connect each SKU to its approved commercial and material source.

### Actions

1. Open `Style > SKUs`.
2. Select `New Style SKU`.
3. Enable `Use Matrix`.
4. Create only the active color and size combinations.
5. Attach the approved Supplier Quote to all generated SKUs.
6. Set `ttPOOrderQtyRatio` for every SKU.
7. Set `ttLoadedMainMaterial` for every SKU by selecting the Excel `Material_Code`.
8. Verify SKU descriptions and generated codes.

### Source fields

- `Colour`
- `Existing_New`
- `Size_Range`
- Size columns
- `Material_Code`
- `Description`
- `Generic`
- `Total_Qty`

### Quantity rule

The supplied example has all size values set to `0` while `Total_Qty` is `15511`. The automation must not create a zero-quantity PO. It must either:

1. receive a valid size split from Excel, or
2. use an approved `ttPOOrderQtyRatio` template and show the calculated quantities for confirmation.

The calculated size quantities must add exactly to `Total_Qty` after rounding.

### Completion criteria

- Every active color-size combination has one SKU.
- Every SKU has the approved supplier quote.
- Every SKU has the loaded main material.
- Quantity ratios are present and total 100%.
- Calculated quantity total equals `Total_Qty`.

## Step 7 — Create supplier PO

### Goal

Create the supplier PO using the validated supplier, SKU, quantity, price and date data.

### Actions

1. Open `Sourcing > POs > Supplier POs`.
2. Select `New Supplier PO`.
3. Select the supplier.
4. Enter or generate the Supplier PO number.
5. Set Total Order Quantity.
6. Set Ex-Factory Date.
7. Set Shipment Date.
8. Set Launch Date.
9. Select the correct holiday calendar and critical path.
10. Continue to the order matrix.
11. Add the generated SKUs and calculated quantities.
12. Validate totals, capacity and mandatory attributes.

### Source fields

- `Supplier_ID`
- `Vendor_Name`
- `Vendor_Type`
- `Cost`
- `Total_Qty`
- `Ex_Factory_Date`
- `Shipment_Date`
- `Launch_Date`
- `hsn_code`

### Completion criteria

- PO contains the correct supplier and all intended SKUs.
- PO unit cost comes from the approved supplier quote.
- Order matrix total equals `Total_Qty`.
- Ex-factory, shipment and launch dates pass the configured rules.
- Capacity and mandatory attribute checks pass or have an approved exception.

## Step 8 — Validate, approve and issue PO

### Goal

Move the PO from Draft through the real approval route to Ready and Issued.

### Actions

1. Run mandatory attribute validation.
2. Run total and size-quantity validation.
3. Run supplier capacity and date validation.
4. Send to Merchandiser.
5. Route to Sourcing and Accounts when required by policy.
6. Capture approval, return reason, owner and timestamp for every handoff.
7. Move the PO to Ready.
8. Issue the supplier PO.
9. Show PO PDF generation, supplier delivery and SAP synchronization state.

### Completion criteria

- No blocking errors remain.
- Required role approvals are complete.
- PO state is Ready before issue.
- Supplier PO is Issued.
- Issued PO number, issuer, issue date and SAP sync state are stored.

## Example source record

| Field | Value |
| --- | --- |
| Season | Zudio AW 26 |
| Description | W26D14 EA CHK 347001 T SHIRT NOV |
| Material Code | FKn01144 |
| Colour | BLACK |
| Existing / New | NEW |
| MRP | 999 |
| Supplier ID | 11301069 |
| Vendor Name | NZ SEASONAL WEAR PRIVATE LIMITED |
| Cost | 100 |
| Total Quantity | 15511 |
| Ex-Factory Date | 02-12-2026 |
| Shipment Date | 02-12-2026 |
| Launch Date | 17-12-2026 |
| Vendor Type | Domestic |
| Supplier Request Template | Silver Seal Request Template |
| New Supplier Request | Y |
| HSN Code | 62033300 |

### Example record warnings

- Brand / Division, Product Type, Style Type, Template, Style Name and Department are blank in the supplied sample. Step 1 must block until the required values are present or an approved defaulting rule fills them.
- Every size field is `0` while Total Quantity is `15511`. Step 6 requires an approved size ratio before PO creation.
- Ex-Factory Date and Shipment Date are identical. This is allowed only if the configured critical path permits same-day shipment handoff.
- Cost `100` and MRP `999` must use the configured currency and tax basis.
- `FKn01144` should be matched case-insensitively but saved using the exact PLM material code.

## Excel field-to-step ownership

| Step | Fields |
| --- | --- |
| 1 Style creation | Season, create_new_style, Image, Department, Brand/Division, Product_Type, Style_Type, Template, Style_Name, Size_Range, size columns, MATKL_Description_3, description_code, Description, Generic |
| 2 Color combo | Colorway_Selection, Pantone_Color_Code, DROP, month, Strategy, fit_type, Story_name, Buy_type, Fixture name, Garment_design, Garment_length, Store_grade, Colour, Existing_New, MRP |
| 3 BOM | Material_Code, MATKL_Description_3, Colour, size columns |
| 4 Supplier request | Supplier_ID, Vendor_Name, Vendor_Type, supplier_request_template, new_supplier_request |
| 5 Supplier quote/code | Supplier_ID, Vendor_Name, Cost, MRP, hsn_code, Vendor_Type |
| 6 SKUs | Colour, Existing_New, Size_Range, size columns, Description, Generic, Material_Code, Total_Qty |
| 7 Supplier PO | Supplier_ID, Vendor_Name, Vendor_Type, Cost, Total_Qty, Ex_Factory_Date, Shipment_Date, Launch_Date, hsn_code |
| 8 Approval and issue | Derived validation and approval policy fields; issued PO and SAP results are written back |

## Required automation behavior

- Use idempotent create-or-find behavior for Style, Color Combo, Supplier Request, Supplier Quote, SKU and Supplier PO.
- Save PLM object IDs after every successful creation.
- Never use raw Excel enum text without resolving an active PLM key.
- Never continue after an ambiguous master-data match.
- Preserve user-entered data when validation fails.
- Retry only safe read operations automatically; avoid repeating create or approve actions without an idempotency check.
- Record request, response, object ID, state transition and error details without storing credentials.
- Allow restart from the first incomplete step.
- Write generated IDs, statuses and errors back to the source row or run log.

## Proposed UI information architecture

```text
Style-to-PO Workspace
├── Source record and run status
├── 1. Style creation
├── 2. Color combo
├── 3. BOM
├── 4. Supplier request
├── 5. Supplier quote/code
├── 6. SKUs
├── 7. Supplier PO
└── 8. Approval and issue
```

The eight-step rail remains visible on every page. The active step owns the main workspace. A right-side `Source data` drawer shows the exact Excel values and their mapping without forcing the user to leave the workflow.

## Visual theme exploration brief

The next deliverable is four theme alternatives using the **same Color Combo screen and the same Zudio AW26 data** so the visual systems can be compared fairly.

All four alternatives must include:

- the complete eight-step workflow rail;
- Step 2, Color Combo, as the active stage;
- Zudio AW26 context and the sample vendor/material/order summary;
- colorway creation, PLM enum attributes and active-value validation;
- a visible source-data panel;
- one clear primary action: `Save & continue to BOM`;
- desktop dimensions of 1440 × 1024;
- professional enterprise density without the old Centric PLM clutter;
- readable labels, strong spacing, no browser chrome, no giant blank areas and no nested-card overload.

The four visual systems should be meaningfully different:

1. Refined Teal — clean light surfaces and disciplined Tata Trent teal.
2. Midnight Operations — navy/graphite navigation with high-contrast operational content.
3. Fashion Editorial — warm neutral surfaces, restrained burgundy/copper accents and premium typography.
4. Precision Blue — cool white, cobalt/indigo accents and compact data-tool clarity.

## Source evidence

The 37 supplied Centric PLM screenshots are preserved in [`source-images/`](source-images/). The most relevant references for this eight-step definition are:

- Screenshots 02–07: season navigation and style creation
- Screenshots 08–09: color combo and colorway attributes
- Screenshots 10–11 and 20: BOM and main material
- Screenshots 25–29: supplier request, quote, cost and approval
- Screenshots 30–31: SKU matrix and quote linking
- Screenshots 32–33: supplier PO creation, validation and handoff
- Screenshots 34–36: merchandiser, sourcing and accounts approval views

## Open business confirmations

1. Exact PLM field meant by `supplier code` in Step 5.
2. Department input or defaulting rule for the Zudio record.
3. Approved quantity-ratio template when all Excel size values are zero.
4. Whether same-day Ex-Factory and Shipment dates are allowed for Domestic orders.
5. Exact approval route and conditions for Merchandiser, Sourcing and Accounts.
6. When the SAP PO number is created and what failures should block the final state.

## Generated theme assets

- [Refined Teal](theme-exploration-v2/theme-refined-teal.png)
- [Midnight Operations](theme-exploration-v2/theme-midnight-operations.png)
- [Fashion Editorial](theme-exploration-v2/theme-fashion-editorial.png)
- [Precision Blue](theme-exploration-v2/theme-precision-blue.png)

## Selected five-workspace direction

- Selected visual theme: [Fashion Editorial](theme-exploration-v2/theme-fashion-editorial.png)
- Detailed five-workspace design: [FIVE-PAGE-PROCESS.md](FIVE-PAGE-PROCESS.md)
- Generated screens: [fashion-editorial-process-v3/](fashion-editorial-process-v3/)

## Alternative run-centric direction

- Detailed process: [ALTERNATIVE-AUTOMATION-FLOW.md](ALTERNATIVE-AUTOMATION-FLOW.md)
- Generated screens: [fashion-editorial-automation-v4/](fashion-editorial-automation-v4/)
