# Feature Specification: Oak Addition Calculator

**Feature Branch**: `002-oak-calculator`

**Created**: 2026-09-04

**Revised**: 2026-09-04

**Status**: Draft

**Input**: Multi-line oak addition worksheet that produces a printable cellar work order. The winemaker specifies a batch header (volume, varietal, target % new oak), adds one or more product lines each with a percentage share of the total treatment, and receives per-line quantities in the appropriate unit. The completed worksheet prints as a cellar work order. Access is gated to Subscriber and Founder accounts.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Author and Calculate a Single-Product Work Order (Priority: P1)

A winemaker is treating a tank of Pinot Noir with a single oak product. They open the worksheet, fill in the batch header (volume, varietal, target %), add one line item for their chosen product, assign it 100% of the share, and immediately see the quantity they need to order. The share total shows "100% — Complete" and the quantity appears on the line.

**Why this priority**: The minimal end-to-end path — header → one line at 100% → result — must work before split treatments or printing matter. If this fails, nothing else is testable.

**Independent Test**: A subscriber can complete the entire flow (header + one line + 100% share) and verify the displayed quantity against the formula using only a calculator and the reference rates.

**Acceptance Scenarios**:

1. **Given** a logged-in Subscriber on /oak-calculator, **When** they enter volume 2,000 gal, varietal "Cabernet Sauvignon", target 50%, add a line with Chips/Beans · M+ · French · "Nadalie" · 100% share, **Then** the share total shows "100% — Complete", and the line displays 25 lbs. (gallons_to_treat = 2,000 × 0.50 = 1,000; line_gallons = 1,000 × 1.00 = 1,000; quantity = 1,000 × 25/1,000 = 25.0 → ceiling = 25 lbs.)

2. **Given** the above inputs, **When** the winemaker changes the volume from 2,000 to 3,000 gallons, **Then** the line quantity updates immediately to 38 lbs. (gallons_to_treat = 3,000 × 0.50 = 1,500; quantity = 1,500 × 25/1,000 = 37.5 → ceiling = 38 lbs.)

3. **Given** a varietal field left blank, **When** all other fields are complete, **Then** the worksheet shows a required-field indicator on the varietal and the print action is unavailable.

4. **Given** a supplier field on a line left blank, **When** all other fields are complete, **Then** a required-field indicator appears on that line's supplier field and the print action is unavailable.

---

### User Story 2 - Multi-Line Split Treatment (Priority: P2)

A winemaker is blending two oak products at different percentages of the total treatment. They add two lines, set each line's share, watch the share total climb from 0% to their partial value and then to 100%, and see per-line quantities for both products simultaneously.

**Why this priority**: The split-treatment workflow is the primary real-world use case and exercises the share constraint, multiple quantity calculations, and the running total indicator.

**Independent Test**: A subscriber can add two or more lines with shares summing to 100% and verify that each line's quantity equals the hand-calculated value for its share of the treatment.

**Acceptance Scenarios**:

1. **Given** volume 5,000 gal, varietal "Pinot Noir", target 60%, and two lines — Line 1: Chips/Beans · M · French · "Radoux" · 60% share, Line 2: Mini Staves · EXT · French · "Innerstave" · 40% share — **When** both lines are present, **Then** the share total shows "100% — Complete", Line 1 displays 45 lbs, and Line 2 displays 163 staves. (gallons_to_treat = 5,000 × 0.60 = 3,000; Line 1: 3,000 × 0.60 × 25/1,000 = 45.0 → 45 lbs; Line 2: 3,000 × 0.40 × 135.59/1,000 = 162.708 → ceiling = 163 staves.)

2. **Given** the same setup with only Line 1 entered (60% share), **When** the winemaker reviews the share indicator, **Then** it shows "60% — Incomplete" and no quantities are displayed.

3. **Given** both lines entered and shares summing to 110%, **When** the winemaker reviews the share indicator, **Then** it shows "110% — Over 100%" and no quantities are displayed.

4. **Given** the winemaker adds a third line and enters a share that brings the total above 100%, **When** reviewing the indicator, **Then** it immediately updates to the error state with the new total shown.

---

### User Story 3 - Print Cellar Work Order (Priority: P3)

A winemaker has completed a valid worksheet (shares total exactly 100%, all required fields filled) and sends it to the printer as a cellar work order. The printed sheet shows the batch header, every product line with all of its fields and the computed quantity, and the toast availability note.

**Why this priority**: The printed work order is the deliverable handed to the cellar crew. Without it the tool is useful for planning but not for production.

**Independent Test**: A subscriber with a valid complete worksheet can trigger browser print and visually verify that the printed page includes: batch header (volume, varietal, target %, gallons to treat), all line items (format, toast, oak type, supplier, share, quantity with unit), and the toast availability note.

**Acceptance Scenarios**:

1. **Given** a valid worksheet with all required fields and shares totaling 100%, **When** the winemaker triggers the print action, **Then** the browser print dialog opens and the print preview shows a cellar work order with the batch header, all lines with their quantities, and the note "Verify toast availability with your supplier — not all toast levels are offered in every format or oak type."

2. **Given** a worksheet where shares total less than 100%, **When** the winemaker attempts to trigger print, **Then** the print action is disabled or absent — no print dialog opens.

3. **Given** a worksheet where any required field (varietal or any line's supplier) is empty, **When** attempting to print, **Then** the print action is disabled or absent.

4. **Given** a valid worksheet is printed, **When** reviewing the printed output, **Then** screen-only navigation, share-total indicators, and interactive controls are not visible — only the work order content appears.

---

### User Story 4 - Access Control (Priority: P4)

The calculator is gated to paid tiers. Unauthenticated visitors are redirected to sign-in; free-tier users see an upgrade prompt; paid subscribers see the worksheet immediately.

**Why this priority**: Authorization must be airtight per the project constitution. Tested independently because it requires no worksheet content to verify.

**Independent Test**: Can be fully tested using accounts at different tiers without interacting with any worksheet inputs.

**Acceptance Scenarios**:

1. **Given** an anonymous visitor, **When** they navigate to /oak-calculator, **Then** they are redirected to /auth/sign-in with the return path preserved.

2. **Given** a logged-in free-tier user, **When** they navigate to /oak-calculator, **Then** they see an upgrade prompt — the worksheet is not rendered.

3. **Given** a logged-in Subscriber or Founder, **When** they navigate to /oak-calculator, **Then** the worksheet renders immediately with an empty header and a prompt to add the first line.

---

### Edge Cases

- What happens when the winemaker deletes a line? The share total recalculates immediately; if the new total is no longer 100%, quantities clear and the print action becomes unavailable.
- What happens when volume is entered with a comma (e.g., "1,000")? The volume input is a plain number field; comma formatting appears in the batch summary and print output only, not in the input itself.
- What if a line share is 0%? A zero-share line is an error — validation prevents it from contributing to a valid worksheet.
- What if the winemaker enters more than two lines? No line limit is enforced; the share constraint applies regardless of how many lines are present.
- What is the result unit for Tank Staves? Always square feet. The note "Check with your supplier for sq ft per stave." appears on that line in both the on-screen result and the printed work order.
- What if % new oak is 100%? The full volume is treated; gallons_to_treat equals the entered volume. This is valid.
- Can shares be non-integer? Per-line share inputs accept whole-number percentages only. This prevents floating-point precision issues with the "exactly 100" constraint.

## Requirements *(mandatory)*

### Functional Requirements

**Header**

- **FR-001**: The worksheet MUST accept a wine volume input in US gallons; valid values are any positive number from 1 to 1,000,000 (decimal values permitted). Volume MUST be displayed with comma formatting (e.g., 5,000).
- **FR-002**: The worksheet MUST accept a wine varietal as required free text (any non-empty string).
- **FR-003**: The worksheet MUST accept a target % new oak equivalent as a required whole number from 1 to 100 inclusive.

**Line Items**

- **FR-004**: The worksheet MUST allow the winemaker to add one or more line items.
- **FR-005**: Each line MUST have a format selector with exactly four options: Chips/Beans, Dominoes/Cubes, Mini Staves, Tank Staves.
- **FR-006**: Each line MUST have a toast level selector with exactly seven options: UT (Untoasted), LT (Light), M (Medium), M+ (Medium+), H (Heavy), CON (Connective/Savour), EXT (Extended).
- **FR-007**: Each line MUST have an oak type selector with exactly four options: American, French, East European, Other.
- **FR-008**: Each line MUST have a supplier field (required free text).
- **FR-009**: Each line MUST have a percentage share input (required whole integer ≥ 1). All line shares must collectively sum to exactly 100% for quantities to display or the print action to be available.

**Share Constraint**

- **FR-010**: The worksheet MUST display a running share total that updates immediately on every change. The total MUST show three distinct states — each identified by both a text label and a color indicator (never color alone):
  - Incomplete: total < 100% — label "X% — Incomplete"
  - Valid: total = 100% — label "100% — Complete"
  - Over limit: total > 100% — label "X% — Over 100%"
- **FR-011**: Quantities MUST NOT be displayed when the share total is not exactly 100%.
- **FR-012**: The print action MUST NOT be available when the share total is not exactly 100%.
- **FR-013**: The print action MUST NOT be available when any required field is empty (varietal or any line's supplier).

**Calculation**

- **FR-014**: The batch gallons to treat MUST be calculated as: `gallons_to_treat = volume × (target_pct / 100)`.
- **FR-015**: Per-line gallons MUST be calculated as: `line_gallons = gallons_to_treat × (line_share / 100)`.
- **FR-016**: Per-line quantity MUST be calculated as: `line_quantity = line_gallons × (format_rate / 1000)`, using these fixed rates: Chips/Beans 25 lbs/1,000 gal · Dominoes/Cubes 60 lbs/1,000 gal · Mini Staves 135.59 staves/1,000 gal · Tank Staves 390 sq ft/1,000 gal.
- **FR-017**: All output quantities MUST be whole numbers using ceiling rounding. No decimal results appear anywhere in the output.
- **FR-018**: For Tank Staves lines, the note "Check with your supplier for sq ft per stave." MUST appear alongside the quantity in both screen and print views.

**Batch Summary**

- **FR-019**: When the share total is exactly 100%, the worksheet MUST display a batch summary showing: wine volume, varietal, target %, and gallons to treat.

**Print**

- **FR-020**: The worksheet MUST support browser printing via a print stylesheet. The printed output is a cellar work order.
- **FR-021**: The printed work order MUST include: batch header (volume, varietal, target %, gallons to treat), and for each line: format, toast level, oak type, supplier, share %, and quantity with unit.
- **FR-022**: The printed work order MUST include the note: "Verify toast availability with your supplier — not all toast levels are offered in every format or oak type."
- **FR-023**: Screen-only elements (share-total indicator, add-line controls, interactive inputs, navigation) MUST NOT appear in the printed output.

**Access**

- **FR-024**: The worksheet MUST be accessible only to users with a Subscriber or Founder account (paid tier). Unauthenticated visitors are redirected to sign-in. Free-tier users see an upgrade prompt.

**Scope Boundary**

- **FR-025**: The worksheet MUST NOT persist, save, or transmit any inputs or results to any storage system. All data is session-local.
- **FR-026**: The worksheet MUST NOT display cost or pricing information.
- **FR-027**: The worksheet MUST NOT perform product catalog or SKU lookup.

### Key Entities

- **WorkOrder**: The complete worksheet for one batch. Composed of a header and one or more line items. Valid when all required fields are filled and line shares sum to exactly 100%.
- **Header**: The three batch-level inputs — volume (gallons), varietal (text), and target % new oak equivalent — plus the two derived values: gallons to treat and batch summary.
- **LineItem**: One product in the treatment plan. Carries format, toast level, oak type, supplier, and share %. Derives line gallons and quantity from the header and its own share.
- **OakFormat**: One of four product categories, each with a fixed addition rate and an output unit. Sourced from `claude/oak-calculator-reference.md`.
- **ShareTotal**: The live sum of all line shares. Drives the three-state indicator and gates quantity display and print.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A winemaker can open the worksheet, complete a valid single-product entry, and read the result in under 90 seconds from page load.
- **SC-002**: The share total indicator and all quantities update within 1 second of any input change, with no form submission required.
- **SC-003**: Every computed quantity exactly matches the value produced by the three-step formula applied by hand, for any valid combination of inputs, with zero arithmetic errors.
- **SC-004**: The print action is unavailable in 100% of cases where shares do not total exactly 100% or any required field is empty. No partial or invalid work order can be printed.
- **SC-005**: The printed work order contains all required fields (header + per-line format, toast, oak type, supplier, share, quantity) and the toast availability note, with no interactive or screen-only elements visible.
- **SC-006**: The worksheet is inaccessible to 100% of non-Subscriber, non-Founder accounts via direct URL navigation.

## Assumptions

- Per-line share percentages are whole numbers (integers). This avoids floating-point precision issues with the "exactly 100%" constraint. Winemakers working with thirds can use 33/33/34 splits.
- Toast level, oak type, and supplier fields are informational — they appear on the work order for ordering reference but do not affect quantity arithmetic.
- The worksheet does not support unit conversion; volume is in US gallons only.
- The initial state of the worksheet is an empty header and zero lines, with a prompt to add the first line.
- There is no maximum number of lines enforced by the system.
- Browser print is the only supported output mechanism. PDF export is out of scope.
- The worksheet state is not persisted; refreshing the page resets everything.
- Phase 2 items (saved batches, cost/pricing, product catalog/SKU, inventory reconciliation, API access) are explicitly excluded from this slice.
