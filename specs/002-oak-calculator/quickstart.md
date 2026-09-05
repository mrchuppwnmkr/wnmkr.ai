# Quickstart & Validation Guide: Oak Addition Calculator

**Branch**: `002-oak-calculator` | **Date**: 2026-09-04

This guide covers how to validate the worksheet end-to-end after implementation. Unit tests for the pure calculation functions live separately in `lib/oak-calculator/calculate.test.ts`.

---

## Prerequisites

- Dev server running: `npm run dev` from repo root
- At least one user in Supabase with `tier = 'vintner'` (or higher) linked to a Clerk account
- A second user with `tier = 'free'` for negative-path testing
- Environment variables set per `.env.local.example`

---

## Scenario 1: Single-Product Work Order — Full Path

**User**: Logged in as a Subscriber (`tier = 'vintner'`)
**Goal**: Complete a single-line work order and verify the quantity

1. Navigate to `http://localhost:3000/oak-calculator`
2. **Expected**: Worksheet renders with empty header and a prompt to add a line — no upgrade prompt, no redirect
3. Fill header:
   - Volume: **2000**
   - Varietal: **Cabernet Sauvignon**
   - Target % new oak: **50**
4. Click "Add line" and fill Line 1:
   - Format: **Chips / Beans**
   - Toast: **M+**
   - Oak type: **French**
   - Supplier: **Nadalie**
   - Share %: **100**
5. **Expected — share indicator**: "100% — Complete" (green)
6. **Expected — Line 1 quantity**: **25 lbs**
7. **Expected — batch summary visible**: Volume 2,000 gal · Cabernet Sauvignon · 50% new oak · 1,000 gal to treat

Hand calc:
- gallons_to_treat = 2,000 × (50/100) = 1,000
- line_gallons = 1,000 × (100/100) = 1,000
- raw_quantity = 1,000 × (25/1,000) = 25.0 → ceil = **25 lbs** ✓

---

## Scenario 2: Two-Product Split Treatment

**User**: Logged in as a Subscriber
**Goal**: Verify share constraint, two-line calculation, and ceiling rounding on staves

1. Navigate to `http://localhost:3000/oak-calculator`
2. Fill header: Volume **5000**, Varietal **Pinot Noir**, Target **60**
3. Add Line 1: Chips / Beans · M · French · "Radoux" · Share **60**
4. **Expected — share indicator**: "60% — Incomplete" (amber) — no quantities displayed
5. Add Line 2: Mini Staves · EXT · French · "Innerstave" · Share **40**
6. **Expected — share indicator**: "100% — Complete" (green)
7. **Expected — Line 1**: **45 lbs**
8. **Expected — Line 2**: **163 staves**
9. **Expected — batch summary**: 5,000 gal · Pinot Noir · 60% · 3,000 gal to treat

Hand calc:
- gallons_to_treat = 5,000 × (60/100) = 3,000
- Line 1: 3,000 × (60/100) × (25/1,000) = 1,800 × 0.025 = 45.0 → ceil = **45 lbs** ✓
- Line 2: 3,000 × (40/100) × (135.59/1,000) = 1,200 × 0.13559 = 162.708 → ceil = **163 staves** ✓

---

## Scenario 3: Three-Product with Tank Staves

**User**: Logged in as a Subscriber
**Goal**: Verify three-line calculation, Tank Staves unit, supplier note

1. Navigate to `http://localhost:3000/oak-calculator`
2. Fill header: Volume **10000**, Varietal **Cabernet Blend**, Target **75**
3. Add Line 1: Chips / Beans · H · American · "Stavin" · Share **50**
4. Add Line 2: Dominoes / Cubes · M+ · French · "Radoux" · Share **30**
5. Add Line 3: Tank / Fan Staves · M · French · "Innerstave" · Share **20**
6. **Expected — share indicator**: "100% — Complete"
7. **Expected — Line 1**: **94 lbs**
8. **Expected — Line 2**: **135 lbs**
9. **Expected — Line 3**: **585 sq ft** with note "Check with your supplier for sq ft per stave."
10. **Expected — batch summary**: 10,000 gal · Cabernet Blend · 75% · 7,500 gal to treat

Hand calc:
- gallons_to_treat = 10,000 × (75/100) = 7,500
- Line 1: 7,500 × (50/100) × (25/1,000) = 3,750 × 0.025 = 93.75 → ceil = **94 lbs** ✓
- Line 2: 7,500 × (30/100) × (60/1,000) = 2,250 × 0.060 = 135.0 → ceil = **135 lbs** ✓
- Line 3: 7,500 × (20/100) × (390/1,000) = 1,500 × 0.390 = 585.0 → ceil = **585 sq ft** ✓

---

## Scenario 4: Share Constraint States

**User**: Logged in as a Subscriber
**Goal**: Verify all three share indicator states and that quantities gate correctly

1. Navigate to `http://localhost:3000/oak-calculator`
2. Fill header: Volume **1000**, Varietal **Chardonnay**, Target **40**
3. Add Line 1: Chips / Beans · M · French · "Nadalie" · Share **70**
4. **Expected**: Indicator shows "70% — Incomplete" (amber); no quantities displayed
5. Change Line 1 share to **110**
6. **Expected**: Indicator shows "110% — Over 100%" (red); no quantities displayed
7. Change Line 1 share to **100**
8. **Expected**: Indicator shows "100% — Complete" (green); Line 1 displays **10 lbs**

Hand calc (share = 100):
- gallons_to_treat = 1,000 × 0.40 = 400
- 400 × (100/100) × (25/1,000) = 400 × 0.025 = 10.0 → ceil = **10 lbs** ✓

---

## Scenario 5: Print Gating

**User**: Logged in as a Subscriber
**Goal**: Verify print is gated correctly

1. With an incomplete worksheet (shares ≠ 100%), **verify** the Print button is disabled or absent
2. With shares at 100% but Varietal left blank, **verify** the Print button is disabled
3. With shares at 100% but a line's Supplier left blank, **verify** the Print button is disabled
4. With all required fields filled and shares at 100%, **verify** the Print button is active
5. Click Print — **Expected**: Browser print dialog opens
6. In print preview, **verify**:
   - Batch header is visible (volume, varietal, target %, gallons to treat)
   - All lines appear with format, toast, oak type, supplier, share %, quantity, unit
   - Tank Staves lines show the supplier note
   - Note visible: "Verify toast availability with your supplier — not all toast levels are offered in every format or oak type."
   - Share-total indicator is NOT visible
   - Add-line and remove-line buttons are NOT visible
   - Interactive form controls are NOT visible

---

## Scenario 6: Line Deletion Recalculates

**User**: Logged in as a Subscriber, two-line worksheet at 100%
**Goal**: Verify share total updates immediately on line deletion

1. Set up the two-line worksheet from Scenario 2 (shares: 60% + 40% = 100%, quantities visible)
2. Delete Line 2 (40% share)
3. **Expected**: Share indicator immediately shows "60% — Incomplete" (amber); quantities clear; Print disabled

---

## Scenario 7: Access Control

**Anonymous visitor**:
1. Open private/incognito browser
2. Navigate to `http://localhost:3000/oak-calculator`
3. **Expected**: Redirect to `/auth/sign-in?return_to=%2Foak-calculator`

**Free-tier user**:
1. Log in as a user with `tier = 'free'`
2. Navigate to `http://localhost:3000/oak-calculator`
3. **Expected**: Upgrade prompt renders; worksheet does not render

**Subscriber**:
1. Log in as a user with `tier = 'vintner'` or higher
2. Navigate to `http://localhost:3000/oak-calculator`
3. **Expected**: Empty worksheet renders immediately

---

## Calculation Reference Table

Formula: `gallons_to_treat = volume × (target/100)` → per line: `line_gallons × (rate/1000)` → `Math.ceil`.

| Volume | Target% | Line | Format        | Share% | Hand Calc                                     | Expected |
|--------|---------|------|---------------|--------|-----------------------------------------------|----------|
| 1,000  | 100     | 1    | Chips/Beans   | 100    | 1,000 × 1.00 × 25/1,000 = 25.0 → ceil        | 25 lbs   |
| 1,000  | 50      | 1    | Dominoes      | 100    | 500 × 1.00 × 60/1,000 = 30.0 → ceil          | 30 lbs   |
| 1,000  | 50      | 1    | Mini Staves   | 100    | 500 × 1.00 × 135.59/1,000 = 67.795 → ceil    | 68 staves|
| 1,000  | 50      | 1    | Tank Staves   | 100    | 500 × 1.00 × 390/1,000 = 195.0 → ceil        | 195 sq ft|
| 2,000  | 75      | 1    | Chips/Beans   | 50     | 1,500 × 0.50 × 25/1,000 = 18.75 → ceil       | 19 lbs   |
| 2,000  | 75      | 2    | Mini Staves   | 50     | 1,500 × 0.50 × 135.59/1,000 = 101.693 → ceil | 102 staves|
| 5,000  | 40      | 1    | Chips/Beans   | 33     | 2,000 × 0.33 × 25/1,000 = 16.5 → ceil        | 17 lbs   |
| 5,000  | 40      | 2    | Mini Staves   | 34     | 2,000 × 0.34 × 135.59/1,000 = 92.201 → ceil  | 93 staves|
| 5,000  | 40      | 3    | Dominoes      | 33     | 2,000 × 0.33 × 60/1,000 = 39.6 → ceil        | 40 lbs   |
| 750    | 80      | 1    | Mini Staves   | 100    | 600 × 1.00 × 135.59/1,000 = 81.354 → ceil    | 82 staves|
| 10,000 | 100     | 1    | Tank Staves   | 100    | 10,000 × 1.00 × 390/1,000 = 3,900 → ceil     | 3,900 sq ft|

Note for multi-line rows: verify that `33 + 34 + 33 = 100` (the share constraint is satisfied) before the results appear.

---

## Known Constraints

- Worksheet state is lost on page refresh — no save functionality in this slice.
- Per-line shares are whole numbers only; the input field should reject decimals.
- Volume is US gallons only; no unit conversion.
- No cost, pricing, or SKU data is displayed — out of scope.
- PDF export is out of scope; use browser's "Save as PDF" option in the print dialog if needed.
