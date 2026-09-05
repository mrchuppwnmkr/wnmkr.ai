# Oak Addition Calculator — Reference Data

**Source:** `2010_Oak_Alt_Projection_102510.xlsx` (Mike's Fetzer oak planning workbook, 2010 vintage)
**Rewritten:** 2026-09-04, direct from the workbook. **Supersedes the earlier summary**, which was
transcribed second-hand and contained errors — see *Corrections* at the bottom.

This document has two parts. **Part 1** is the data the `002-oak-calculator` slice needs.
**Part 2** records the rest of the spreadsheet's model, which is deliberately out of scope for
Phase 1 but is the specification source for a future blend-planning feature.

---

# Part 1 — In scope for `002-oak-calculator`

## Oak formats and addition rates

Addition rates are per 1,000 gallons of wine **being treated** (not total blend volume).

| Format | Catalog name | Addition rate | Unit | Typical contact |
|---|---|---|---|---|
| **Chips / Beans** | `Bean` | **25** | lbs per 1,000 gal | 1–4 weeks |
| **Dominoes / Cubes** | `Domino` | **60** | lbs per 1,000 gal | 2–8 weeks |
| **Mini Staves (FNO, cross-cut)** | `mini Stave` | **135.59** | staves per 1,000 gal | weeks–months |
| **Tank / Fan Staves** | `Stave` | **390** | sq ft per 1,000 gal | months |

Each format is measured in its own unit. The UI must show the unit per format rather than
forcing a single unit across all four.

## Toast levels

Codes as they appear in the workbook, with usage counts across the 90-row product catalog:

| Code | Label | In catalog |
|---|---|---|
| `M` | Medium | 12 products |
| `M+` | Medium Plus | 7 products |
| `H` | Heavy | 1 product |
| `CON` | Connective / Savour (American oak, oven-toasted) | 1 product |
| `EXT` | Extended (FNO mini staves only) | 1 product |

`UT` (untoasted) and `LT` (light) appear in the earlier summary but **do not appear as assigned
toast values anywhere in this catalog.** They may be valid industry codes Mike wants offered;
they are not evidenced here. Confirm before including.

**Note for the UI:** not every toast level is available in every format and oak type. `EXT` is
FNO mini staves specifically; `CON` is American oak. The calculator does not enforce valid
combinations — display the advisory: *"Verify toast availability with your supplier — not all
toast levels are offered in every format or oak type."*

## Oak type

The workbook uses a two-value field, `AO` / `FO`:

| Code | Meaning |
|---|---|
| `AO` | American Oak |
| `FO` | French Oak |

The Phase 1 UI offers four options — **American, French, East European, Other** — extending the
workbook's two to cover Hungarian and other Eastern European sources common since 2010.

## Suppliers

Free-text field in Phase 1. Suppliers present in the workbook catalog, useful as placeholder or
autocomplete seed data:

Oak Solution · Nadalie · Stavin · Oenosylva · Innerstave · Canadell · Radoux · Oenodev · FNO

## Calculation

```
gallons_to_treat = volume_gallons × (target_new_oak_pct / 100)
line_gallons     = gallons_to_treat × (line_share_pct / 100)
line_quantity    = line_gallons × (format_addition_rate / 1000)
```

Line shares must sum to exactly 100%. All output quantities are whole numbers, **ceiling**
rounded.

### Worked example

Volume 100,000 gal · target 45% new oak · two lines, 60% dominoes and 40% chips.

```
gallons_to_treat = 100,000 × 0.45           = 45,000 gal
line 1 (Domino)  = 45,000 × 0.60            = 27,000 gal
                 = 27,000 × (60 / 1000)     = 1,620 lbs
line 2 (Bean)    = 45,000 × 0.40            = 18,000 gal
                 = 18,000 × (25 / 1000)     = 450 lbs
```

## Tank staves

The calculator returns **sq ft only**. It does not convert to a stave or set count, because
surface area per stave varies by supplier (see Part 2). Display alongside the result:
*"Check with your supplier for sq ft per stave."*

---

# Part 2 — Out of scope for Phase 1 (future blend planner)

The source workbook is a procurement and cost planning tool, not a calculator. Recorded here so
the model is not lost.

## Structure

One worksheet per blend — 16 in the 2010 workbook (`BNCS`, `PVCS`, `CAME`, `BZ`, etc., coded as
brand + varietal). Each sheet performs a **two-level allocation**:

1. Blend volume × % new oak equivalent → gallons to treat
2. Gallons to treat split across the four formats (shares must total 100%)
3. Within each format, split across supplier line items (shares must total 100%)

Phase 1 flattens this to a single level: every line names its own format, and all line shares
total 100% directly.

## Cost model

The workbook's real output is dollars, not pounds.

- Each catalog product carries a unit price and a UOM (`LBS`, `EA`, or `KG`)
- KG-priced products convert to $/lb by dividing by **2.205**
- Line cost = quantity × converted unit price
- Blend total rolls up to **$ per 1,000 9-litre cases** — the figure used for financial planning
- Cases convert to gallons at **2.4 gallons per case**

## Purchase units

Quantities are ordered in packs, not raw weight.

| Format | Pack unit | Pack sizes in catalog |
|---|---|---|
| Bean | Bag | 15, 20, or 22 lbs per bag |
| Domino | Bag | 20 or 22 lbs per bag |
| mini Stave | Set | 36 staves per set |
| Stave | Set | 16, 20, or 22.4 sq ft per set; 20 or 38 staves per set |

Bag and set counts are rounded to whole units. This is why a real order sheet reads "32 bags,"
not "640 lbs."

## Product catalog

The `Codes` sheet is a 90-row catalog. Each product carries: WMDB code, WMDB description, SAP
code, SAP description, UOM, unit price, supplier, addition rate, toast, AO/FO, forest, format,
lbs/bag, staves sq ft/set, staves/set, order UOM. Blend sheets pull these by `VLOOKUP` on the
WMDB code.

## Forest sub-region

French oak products specify forest of origin: **Allier · Bertrange · Nevers · Vosges**. Not
modelled in Phase 1.

## Inventory reconciliation

`Total usage − inventory − on order = order need`, tracked per product across all blends.

## Validation

The workbook enforces correctness with check rows:

- Format allocation shares total 100% (`=IF(B9<>1,NA(),0)`)
- Line shares within each format total 100%, else `"% <> 100 Error"`
- Line dollars reconcile to the blend total
- Line treated-gallons reconcile to gallons to treat

Phase 1 keeps the share-total check and drops the rest.

---

# Corrections to the previous version of this document

| Item | Old value | Correct value |
|---|---|---|
| **Mini stave addition rate** | 36 staves per 1,000 gal | **135.59 staves per 1,000 gal.** 36 is staves per *set*, a pack size. The old figure understates the dose by roughly 3.8×. |
| **Chips addition rate** | 22–25 lbs (range) | **25 lbs.** The catalog carries a single rate; the range appears to reflect varying pack sizes, not varying dose. |
| **Toast levels** | 7 codes incl. `UT`, `LT` | **5 codes in use:** `M`, `M+`, `H`, `CON`, `EXT`. `UT` and `LT` are unevidenced in this workbook. |
| **Intensity tiers** | Subtle / Moderate / Full bands driving the calc | **Removed.** The user enters a whole-number % new oak equivalent directly. The tiers were a UI invention, not from the workbook. |
| **"Wine types"** | Listed as if wine styles | These are **blend codes** — brand plus varietal, one worksheet each (e.g. `BNCS` = Bonterra Cabernet Sauvignon). |
| **Cost model** | Absent | The workbook's primary output. Recorded in Part 2. |
| **Purchase units** | Absent | Bags and sets, not raw weight. Recorded in Part 2. |

---

# Phase 1 build decisions (✓ resolved)

| # | Question | Decision |
|---|---|---|
| 1 | Custom addition rates (expert mode)? | No — fixed defaults. Deferred. |
| 2 | Contact time by format | Use the Typical Contact column above. |
| 3 | Tank staves — count or sq ft? | **sq ft only.** Supplier note displayed with result. |
| 4 | Printable batch sheet? | **Yes — pulled into Phase 1.** Browser print stylesheet. |
| 5 | Chips rate | Fixed at 25 lbs / 1,000 gal. |
| 6 | Intensity input | Whole number 1–100, entered directly. No tiers. |
| 7 | Rounding | **Ceiling to whole numbers, all formats.** Output is a purchase quantity; rounding down leaves the winemaker short. |
| 8 | Volume input | 1 to 1,000,000 gallons, decimals allowed, comma-separated display. |
| 9 | Multi-line? | **Yes.** Flat list; each line carries its own format. Shares total 100%. |
| 10 | Supplier field | Required, free text. No catalog lookup in Phase 1. |
| 11 | Varietal field | Required, free text. Label only — appears on the printed work order. |
| 12 | Toast filtering by format | No filtering. Show all codes with the supplier advisory. |
| 13 | Cost / pricing | **Out of scope.** See Part 2. |
