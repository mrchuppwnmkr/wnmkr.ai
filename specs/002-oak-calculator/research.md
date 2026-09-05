# Research: Oak Addition Calculator

**Branch**: `002-oak-calculator` | **Date**: 2026-09-04

This document reflects the redesigned feature (multi-line worksheet + printable work order). All decisions below were resolved from the existing codebase, the reference document, and the spec. No external research agents were dispatched.

---

## R-001: Role/Tier Mapping for "Subscriber and Founder"

**Decision**: Gate the worksheet at `minTier: 'vintner'`.

**Rationale**: Unchanged from the previous plan. The `(subscriber)/layout.tsx` and the page stub already call `requireRole({ minTier: 'vintner' })`. All paid tiers (vintner → winemaker → cellar_master) pass this gate. Founders receive a cellar_master tier grant and pass as well.

**Source**: `lib/auth/roles.ts`, `app/(subscriber)/layout.tsx`, `app/(subscriber)/oak-calculator/page.tsx`

**Alternatives considered**: None — the gate is already implemented correctly for this feature.

---

## R-002: Client State Management — useReducer vs. useState

**Decision**: Use a single `useReducer` at the root `Worksheet` component. State shape: `{ header: WorksheetHeader, lines: LineItem[] }`. All derived values (gallons to treat, share total, line results, canPrint) are computed synchronously from this state on every render — no separate state for derived values.

**Rationale**: The worksheet has a fan-out dependency: every header change recomputes quantities for every line, and every line change recomputes the share total and canPrint. Scattering this into per-field `useState` calls creates stale-state bugs. A single reducer with a discriminated action union gives predictable transitions, is easy to test in isolation, and avoids prop-threading complexity without requiring a context or external state library. The component tree is shallow enough (one level of line items) that props suffice for passing down state slices and dispatch.

**Source**: React documentation; standard pattern for complex interdependent form state.

**Alternatives considered**:
- Multiple `useState` calls: rejected — fan-out dependency creates stale-state risk when header changes don't trigger line recalculation.
- Zustand: rejected — unnecessary for a single-page, non-persisted form. No third-party state library needed.
- React Context: rejected — the tree is shallow; props are cleaner and more traceable at this scale.

---

## R-003: Print Implementation — CSS @media print

**Decision**: Browser native print via `window.print()` triggered by a button click. Print stylesheet implemented with Tailwind's `print:hidden` utility on screen-only elements (share indicator, add-line button, interactive controls, navigation) and standard block layout on the work-order content.

**Rationale**: The spec explicitly says "browser print stylesheet." No additional library is needed. `window.print()` is universally supported. Tailwind's `print:` variant maps directly to `@media print` — no separate CSS file needed. Screen-only elements are hidden with `print:hidden`; the work-order content is always rendered in DOM (not conditionally mounted), so print captures it correctly.

**Source**: Tailwind CSS documentation (print variant); `claude/oak-calculator-reference.md` (Build Decision #4 defers PDF — browser print only).

**Alternatives considered**:
- `react-to-print` library: rejected — no benefit over `window.print()` for this use case; adds a dependency.
- Server-side PDF generation: explicitly out of scope per spec FR-020 and reference Build Decision #4.
- `html2canvas` + jsPDF: out of scope for Phase 1.

---

## R-004: Share Total Precision — Integer Arithmetic

**Decision**: Per-line shares are whole-number integers. Share total is computed as `lines.reduce((sum, l) => sum + (l.sharePct ?? 0), 0)`. "Exactly 100" check is `shareTotal === 100` (strict integer equality).

**Rationale**: The spec (Assumptions) requires whole-number per-line shares specifically to avoid floating-point precision issues. Integer summation eliminates the class of bugs where `33.3 + 33.3 + 33.4` evaluates to `99.99999...` rather than `100`. Winemakers can represent thirds as 33/33/34 with no meaningful loss of precision.

**Source**: `specs/002-oak-calculator/spec.md` Assumptions section.

**Alternatives considered**: Allowing one decimal place per line (e.g., 33.3/33.3/33.4) — rejected because it requires a tolerance band (e.g., `Math.abs(total - 100) < 0.01`) which is complex to explain to users and introduces an ambiguous definition of "exactly 100."

---

## R-005: Volume Input Formatting

**Decision**: Volume is stored as a `number | null` in state. The input field renders as `type="number"` with `min=1` and `max=1000000`. Comma formatting is applied in the batch summary display (using `toLocaleString('en-US')`) and in the print output, not in the raw `<input>` element.

**Rationale**: Native `<input type="number">` browsers strip commas on entry, making comma-formatted inputs unreliable across browsers. The spec says volume "MUST be displayed with comma formatting" — this applies to the display/summary, not necessarily the raw input control. Storing as a number avoids parse complexity.

**Source**: `specs/002-oak-calculator/spec.md` FR-001.

**Alternatives considered**: `<input type="text">` with regex stripping of commas on change — rejected because it requires custom parsing, validation, and cursor management. The simpler approach of formatting in display-only contexts satisfies the spec requirement.

---

## R-006: Component Decomposition

**Decision**: Seven components under `components/oak-calculator/`:

| Component | Role |
|-----------|------|
| `worksheet.tsx` | Root — owns state via `useReducer`, renders all children |
| `worksheet-header.tsx` | Three header inputs; dispatches `SET_HEADER` actions |
| `line-item-list.tsx` | Maps lines to `LineItem` rows; renders "Add line" button |
| `line-item.tsx` | One line: four selectors + supplier text + share input + derived result |
| `share-total-indicator.tsx` | Three-state display (incomplete / valid / over) |
| `batch-summary.tsx` | Shown only when `shareTotalState === 'valid'`; displays volume, varietal, target %, gallons to treat |
| `print-button.tsx` | Calls `window.print()`; disabled (`aria-disabled`) when `canPrint` is false |

**Rationale**: Each component has a single clear responsibility. `line-item.tsx` is the most complex single unit — it renders both the inputs and the computed result for one line. Keeping it together avoids a proliferation of tiny components while keeping the root worksheet manageable.

**Source**: Standard Next.js App Router component decomposition patterns.

---

## R-007: Calculation Module Structure

**Decision**: Two pure functions in `lib/oak-calculator/calculate.ts`:

```
deriveWorksheet(header, lines) → WorksheetDerived
calculateLine(gallonsToTreat, line) → LineResult | null
```

`deriveWorksheet` calls `calculateLine` for each line. Neither function has side effects or external dependencies. Both are easily unit-testable with Vitest.

**Rationale**: Separating calculation from React state makes the arithmetic independently testable without mounting any components. `calculateLine` returning `null` for incomplete lines lets the caller (worksheet) decide how to handle partial state without branching inside the formula logic.

**Source**: Standard separation-of-concerns; matches the previous auth slice's pattern of isolating pure domain logic in `lib/`.

---

## R-008: Reference Data — New OakType Dimension

**Decision**: Add `OAK_TYPE_CONFIG` to `lib/oak-calculator/reference-data.ts` alongside the existing `FORMAT_CONFIG` and `TOAST_CONFIG`. Four values: American, French, East European, Other.

**Rationale**: Oak type is a new field in the redesigned worksheet (not in the previous single-addition calculator). It is informational only — it does not affect arithmetic — but it must be a closed enum so the UI can offer a selector and the print output can render it consistently.

**Source**: `specs/002-oak-calculator/spec.md` FR-007.

---

## R-009: Toast Code Abbreviations and Code Set

**Decision**: Store codes exactly as they appear in Mike's workbook catalog: `UT`, `LT`, `M`, `M+`, `H`, `CON`, `EXT` (seven codes). Display labels are human-readable: Untoasted, Light, Medium, Medium+, Heavy, Connective/Savour, Extended.

**Rationale**: The workbook uses `M`, `M+`, and `H` — not the longer forms `MT`, `MT+`, `HV` that appeared in the earlier spec draft. Matching the catalog codes exactly means work orders cross-reference cleanly with orders and inventory that use those same codes.

`UT` (Untoasted) and `LT` (Light) do not appear as toast assignments in the 90-row catalog of this workbook because Fetzer was not purchasing untoasted or light-toast oak during the period covered. They are standard industry toast designations offered by multiple cooperages. Including them here gives winemakers the full code set for current sourcing, even when products weren't in the reference workbook.

**Source**: `claude/oak-calculator-reference.md` (catalog audit, 2026-09-04); product decision confirmed with user 2026-09-04.

**Alternatives considered**: Using longer codes `MT`/`MT+`/`HV` — rejected because they do not match the workbook. Omitting `UT` and `LT` — rejected because they are valid industry codes and useful for winemakers sourcing from cooperages other than Fetzer-era suppliers.

---

## Summary: All Unknowns Resolved

| Unknown | Status | Resolution |
|---------|--------|-----------|
| Role/tier for gate | RESOLVED | `minTier: 'vintner'`, already in stub |
| State management approach | RESOLVED | `useReducer` at root `Worksheet` |
| Print implementation | RESOLVED | `window.print()` + Tailwind `print:hidden` |
| Share total precision | RESOLVED | Integer arithmetic; `=== 100` check |
| Volume input formatting | RESOLVED | `type="number"` input; comma format in display only |
| Component decomposition | RESOLVED | 7 components; see table in R-006 |
| Calculation module | RESOLVED | Two pure functions: `deriveWorksheet`, `calculateLine` |
| OakType reference data | RESOLVED | New `OAK_TYPE_CONFIG` in `reference-data.ts` |
| Toast code set and abbreviations | RESOLVED | Catalog codes (`M`, `M+`, `H`, `CON`, `EXT`) + industry standards (`UT`, `LT`); see R-009 |
