# Data Model: Oak Addition Calculator

**Branch**: `002-oak-calculator` | **Date**: 2026-09-04

All types are TypeScript. No database tables are created or modified. All worksheet data is ephemeral — held in `useReducer` state in the root `Worksheet` client component and lost on page refresh.

---

## Domain Types

### OakFormat

```ts
type OakFormat = 'chips' | 'dominoes' | 'mini-staves' | 'tank-staves'
```

### ToastLevel

```ts
type ToastLevel = 'UT' | 'LT' | 'M' | 'M+' | 'H' | 'CON' | 'EXT'
```

### OakType

New dimension added in the worksheet redesign. Informational only — does not affect quantity arithmetic.

```ts
type OakType = 'american' | 'french' | 'east-european' | 'other'
```

### ShareTotalState

The three states of the running share total indicator (FR-010).

```ts
type ShareTotalState = 'incomplete' | 'valid' | 'over'
```

---

## Worksheet State (held in useReducer)

### WorksheetHeader

The three batch-level inputs. All fields start as `null` (empty). `null` means the field has not been filled in.

```ts
type WorksheetHeader = {
  volumeGallons: number | null   // 1–1,000,000, decimals OK; null = not entered
  varietal: string               // free text; empty string = not filled
  targetPct: number | null       // whole integer 1–100; null = not entered
}
```

### LineItem

One product row in the worksheet. `id` is a stable UUID-style string generated when the line is added (used as React list key). All selector fields start as `null`; supplier starts as empty string.

```ts
type LineItem = {
  id: string                     // stable key; never changes for the life of the line
  format: OakFormat | null
  toastLevel: ToastLevel | null
  oakType: OakType | null
  supplier: string               // free text, required; empty string = not filled
  sharePct: number | null        // whole integer ≥ 1; null = not entered
}
```

### WorksheetState

The complete reducer state. This is the single source of truth.

```ts
type WorksheetState = {
  header: WorksheetHeader
  lines: LineItem[]
}
```

### WorksheetAction

Discriminated union for the reducer (see contracts/worksheet.md for full definitions).

```ts
type WorksheetAction =
  | { type: 'SET_HEADER'; field: keyof WorksheetHeader; value: unknown }
  | { type: 'ADD_LINE' }
  | { type: 'UPDATE_LINE'; id: string; field: keyof Omit<LineItem, 'id'>; value: unknown }
  | { type: 'REMOVE_LINE'; id: string }
  | { type: 'RESET' }
```

---

## Derived Values (computed on every render, not stored)

### LineResult

The computed output for one complete line. Returned by `calculateLine()`. `null` when the line is incomplete or the header is insufficient.

```ts
type LineResult = {
  lineId: string
  lineGallons: number           // gallons assigned to this line
  quantity: number              // ceiling-rounded whole number
  unit: 'lbs' | 'staves' | 'sq ft'
  supplierNote: string | null   // non-null only for tank-staves
}
```

### WorksheetDerived

Everything computed from `WorksheetState`. Returned by `deriveWorksheet()` and consumed by the UI.

```ts
type WorksheetDerived = {
  gallonsToTreat: number | null   // null when header is incomplete
  shareTotal: number              // sum of all line sharePct values (0 when no lines)
  shareTotalState: ShareTotalState
  lineResults: LineResult[]       // empty when shares not exactly 100 or header incomplete
  canDisplay: boolean             // true when shareTotalState === 'valid' and header valid
  canPrint: boolean               // true when canDisplay and all required fields filled
}
```

---

## Reference Data

Defined in `lib/oak-calculator/reference-data.ts`. Source: `claude/oak-calculator-reference.md`.

### FormatConfig

```ts
type FormatConfig = {
  label: string             // display name
  ratePerThousand: number   // addition rate per 1,000 US gallons
  unit: 'lbs' | 'staves' | 'sq ft'
  contactTime: string
  supplierNote: string | null
}
```

Instances — `FORMAT_CONFIG: Record<OakFormat, FormatConfig>`:

| Key           | label             | ratePerThousand | unit    | contactTime   | supplierNote |
|---------------|-------------------|-----------------|---------|---------------|--------------|
| chips         | Chips / Beans     | 25              | lbs     | 1–4 weeks     | null         |
| dominoes      | Dominoes / Cubes  | 60              | lbs     | 2–8 weeks     | null         |
| mini-staves   | Mini Staves       | 135.59          | staves  | weeks–months  | null         |
| tank-staves   | Tank / Fan Staves | 390             | sq ft   | months        | "Check with your supplier for sq ft per stave." |

> **Mini Staves rate note**: 135.59 staves/1,000 gal is derived from catalog product OC1, the only mini stave product in the source workbook. No blend sheet in the source workbook allocated treatment gallons to mini staves, so this rate has not been verified in production use. Confirm with Mike before implementation.

### ToastConfig

```ts
type ToastConfig = {
  code: ToastLevel
  label: string
}
```

`TOAST_CONFIG: ToastConfig[]` — ordered for display:

| code | label               |
|------|---------------------|
| UT   | Untoasted           |
| LT   | Light               |
| M    | Medium              |
| M+   | Medium+             |
| H    | Heavy               |
| CON  | Connective / Savour |
| EXT  | Extended            |

### OakTypeConfig

New for the worksheet redesign. Informational only.

```ts
type OakTypeConfig = {
  value: OakType
  label: string
}
```

`OAK_TYPE_CONFIG: OakTypeConfig[]` — ordered for display:

| value          | label          |
|----------------|----------------|
| french         | French         |
| american       | American       |
| east-european  | East European  |
| other          | Other          |

---

## Calculation Formula

Defined in `lib/oak-calculator/calculate.ts`. Source: `claude/oak-calculator-reference.md`.

**Step 1 — batch level:**
```
gallons_to_treat = volumeGallons × (targetPct / 100)
```

**Step 2 — per line:**
```
line_gallons = gallons_to_treat × (sharePct / 100)
raw_quantity = line_gallons × (format_rate / 1000)
quantity     = Math.ceil(raw_quantity)
```

All output quantities are whole numbers. Ceiling rounding applies to every format. The output is a purchase quantity; rounding down would leave the winemaker short.

**Validation gates before calculating:**
- `volumeGallons` must be a finite number, 1 ≤ value ≤ 1,000,000
- `targetPct` must be an integer, 1 ≤ value ≤ 100
- `sharePct` must be an integer ≥ 1
- `format` must be a recognized `OakFormat` key
- If any check fails, `calculateLine()` returns `null`

**Share total gate (enforced by `deriveWorksheet()`):**
- `lineResults` is populated only when `shareTotal === 100`
- When `shareTotal !== 100`, `lineResults` is `[]` and `canDisplay` is `false`

---

## Validation Rules Summary

| Field | Rule |
|-------|------|
| volumeGallons | Finite number, 1–1,000,000 |
| varietal | Non-empty string |
| targetPct | Integer, 1–100 |
| line.format | One of four OakFormat values |
| line.toastLevel | One of seven ToastLevel codes |
| line.oakType | One of four OakType values |
| line.supplier | Non-empty string |
| line.sharePct | Integer ≥ 1 |
| shareTotal | Must equal exactly 100 for quantities to display or print to be available |

---

## State Transitions

```
Empty worksheet
  → User fills header fields (any order)
  → User adds first line
  → User fills line fields
  → Share indicator: Incomplete (< 100%)
  → User fills remaining share to exactly 100%
  → Share indicator: Complete (= 100%)
  → Quantities appear on all lines
  → Batch summary appears
  → Print button becomes active
  → User triggers print → browser print dialog opens

At any point:
  → User changes a share → indicator updates immediately
  → Total goes over 100% → Share indicator: Over 100%; quantities clear; print disabled
  → User deletes a line → share total recalculates; may revert to Incomplete
```

---

## Out of Scope (Phase 2)

- `Batch` — a named, saved work order with persistence
- `CostLine` — per-line cost and pricing fields
- `SKU` — product catalog lookup
- `CustomRate` — user-overridden addition rate
