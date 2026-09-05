# Contract: Oak Addition Calculator — Worksheet

**Branch**: `002-oak-calculator` | **Date**: 2026-09-04

This contract defines the boundaries between: the server page (auth) and the client worksheet, the root `Worksheet` component and its children, and the UI and the pure calculation module.

---

## 1. Page Contract: `/oak-calculator`

```tsx
// Server component
export default async function OakCalculatorPage(): Promise<React.JSX.Element>
```

**Behavior**:
- Calls `requireRole({ minTier: 'vintner' })` before rendering anything
- `unauthenticated` → `redirect('/auth/sign-in?return_to=/oak-calculator')`
- `insufficient_tier` → renders `<UpgradePrompt required={result.required} />`
- `unavailable` → renders `<ServiceUnavailable />`
- `ok` → renders page shell containing `<Worksheet />`
- Does NOT pass principal, session data, or any auth state to `<Worksheet />`

---

## 2. Calculation Contract: `lib/oak-calculator/calculate.ts`

### `deriveWorksheet`

```ts
function deriveWorksheet(
  header: WorksheetHeader,
  lines: LineItem[]
): WorksheetDerived
```

Always returns a `WorksheetDerived` — never throws, never returns null. When the header is incomplete, `gallonsToTreat` is `null` and `lineResults` is `[]`.

**Computation**:
1. Compute `shareTotal = lines.reduce((s, l) => s + (l.sharePct ?? 0), 0)`
2. Determine `shareTotalState`:
   - `< 100` → `'incomplete'`
   - `=== 100` → `'valid'`
   - `> 100` → `'over'`
3. If header is valid AND `shareTotalState === 'valid'`:
   - Compute `gallonsToTreat = volumeGallons × (targetPct / 100)`
   - Compute `lineResults` by calling `calculateLine(gallonsToTreat, line)` for each line; null returns are omitted — a line whose `format` is null or `sharePct` is null or < 1 has no entry in `lineResults`
   - Set `canDisplay = true`
4. Otherwise: `gallonsToTreat = null`, `lineResults = []`, `canDisplay = false`
5. `canPrint = canDisplay && headerRequiredFilled && allLinesRequiredFilled`

**Header valid** means: `volumeGallons` is a finite number in [1, 1,000,000], `targetPct` is an integer in [1, 100].

**Header required filled** means: additionally `varietal` is a non-empty string.

**All lines required filled** means: every line has a non-null `format`, non-null `toastLevel`, non-null `oakType`, and non-empty `supplier`.

---

### `calculateLine`

```ts
function calculateLine(
  gallonsToTreat: number,
  line: LineItem
): LineResult | null
```

Returns `null` when any line field required for calculation is missing or invalid (`format` null, `sharePct` null or < 1). Otherwise returns a `LineResult`.

**Computation**:
```
line_gallons = gallonsToTreat × (line.sharePct / 100)
raw_quantity = line_gallons × (FORMAT_CONFIG[line.format].ratePerThousand / 1000)
quantity     = Math.ceil(raw_quantity)
```

**Guarantees**:
- `quantity` is always a positive integer
- `unit` always equals `FORMAT_CONFIG[line.format].unit`
- `supplierNote` is non-null if and only if `line.format === 'tank-staves'`

---

## 3. Component Contracts

### `Worksheet` (root)

```tsx
// 'use client'
function Worksheet(): React.JSX.Element
```

- Owns all worksheet state via `useReducer(worksheetReducer, initialState)`
- Calls `deriveWorksheet(state.header, state.lines)` on every render
- Renders `WorksheetHeader`, `ShareTotalIndicator`, `BatchSummary`, `LineItemList`, `PrintButton`
- Accepts no props

---

### `WorksheetHeader`

```tsx
function WorksheetHeader(props: {
  header: WorksheetHeader
  onHeaderChange: (field: keyof WorksheetHeader, value: unknown) => void
}): React.JSX.Element
```

- Renders three inputs: volume (number, 1–1,000,000), varietal (text), target % (number, 1–100)
- Calls `onHeaderChange` on each field's `onChange`
- Shows required-field indicators when a field is empty and the user has interacted with it

---

### `ShareTotalIndicator`

```tsx
function ShareTotalIndicator(props: {
  shareTotal: number
  state: ShareTotalState
}): React.JSX.Element
```

- Renders a labeled indicator using both color and text (never color alone — FR-010)
- `'incomplete'` → amber/yellow, label `"{shareTotal}% — Incomplete"`
- `'valid'` → green, label `"100% — Complete"`
- `'over'` → red, label `"{shareTotal}% — Over 100%"`

---

### `BatchSummary`

```tsx
function BatchSummary(props: {
  header: WorksheetHeader
  gallonsToTreat: number
}): React.JSX.Element
```

- Rendered only when `derived.canDisplay === true`
- Displays: volume (with comma formatting), varietal, target %, gallons to treat (with comma formatting)
- This block IS printed (not hidden by print stylesheet)

---

### `LineItemList`

```tsx
function LineItemList(props: {
  lines: LineItem[]
  lineResults: LineResult[]
  onAddLine: () => void
  onUpdateLine: (id: string, field: keyof Omit<LineItem, 'id'>, value: unknown) => void
  onRemoveLine: (id: string) => void
}): React.JSX.Element
```

- Maps `lines` to `LineItem` components, keyed by `line.id`
- Renders an "Add line" button (hidden in print via `print:hidden`)
- "Add line" button calls `onAddLine`

---

### `LineItem`

```tsx
function LineItem(props: {
  line: LineItem
  result: LineResult | null     // null when canDisplay is false or line is incomplete
  onUpdate: (field: keyof Omit<LineItem, 'id'>, value: unknown) => void
  onRemove: () => void
}): React.JSX.Element
```

- Renders four selectors (format, toast, oak type), one text input (supplier), one number input (share %)
- Renders the computed result when `result` is non-null: quantity, unit, and supplierNote if applicable
- Remove button is hidden in print via `print:hidden`
- When `result` is null, the result area shows nothing (not a placeholder or dash)

---

### `PrintButton`

```tsx
function PrintButton(props: {
  canPrint: boolean
}): React.JSX.Element
```

- Renders a button that calls `window.print()` on click
- When `canPrint` is false, button is visually disabled and has `aria-disabled="true"`; click does nothing
- Hidden in print output via `print:hidden`

---

## 4. Reducer Contract

```ts
function worksheetReducer(state: WorksheetState, action: WorksheetAction): WorksheetState
```

Actions and their effects:

| Action | Effect |
|--------|--------|
| `SET_HEADER { field, value }` | Updates `state.header[field]` |
| `ADD_LINE` | Appends a new empty `LineItem` with a fresh `id` to `state.lines` |
| `UPDATE_LINE { id, field, value }` | Updates `field` on the line matching `id` |
| `REMOVE_LINE { id }` | Removes the line matching `id` from `state.lines` |
| `RESET` | Returns `initialState` |

The reducer never mutates state — it always returns a new object.

---

## 5. Print Contract

**Trigger**: `window.print()` called by `PrintButton` only when `canPrint === true`.

**Print stylesheet behavior** (via Tailwind `print:` utilities):
- `print:hidden` applied to: `PrintButton`, "Add line" button, remove-line buttons, `ShareTotalIndicator`, site navigation, any interactive controls
- All other content (header, `BatchSummary`, `LineItemList` with results) renders normally

**Work order content visible in print** (per FR-021, FR-022):
- Batch header: volume (comma-formatted), varietal, target %, gallons to treat
- Per-line table: format label, toast code + label, oak type label, supplier, share %, quantity with unit
- Tank Staves lines: supplier note "Check with your supplier for sq ft per stave." appears under the quantity
- Footer note: "Verify toast availability with your supplier — not all toast levels are offered in every format or oak type."

---

## 6. Invariants

1. `canPrint` is `false` whenever `shareTotalState !== 'valid'` — no invalid worksheet can be printed.
2. `lineResults` is empty whenever `shareTotalState !== 'valid'` — no partial quantities are shown.
3. Every `LineResult.quantity` is a positive integer (ceiling-rounded).
4. `LineResult.unit` always matches `FORMAT_CONFIG[format].unit`.
5. `LineResult.supplierNote` is non-null if and only if `format === 'tank-staves'`.
6. The client component (`Worksheet`) never receives, stores, or renders auth session data.
7. No addition rate value originates outside `lib/oak-calculator/reference-data.ts`.
