# Oak Addition Calculator — Reference Data

Extracted from Mike's oak addition spreadsheets (multiple versions, 2010 vintage data).
This is the canonical source for seeding the Oak Calculator subscriber tool.

---

## Oak Formats & Addition Rates

| Format | Common Names | Addition Rate | Per | Typical Contact |
|---|---|---|---|---|
| **Chips / Beans** | Bean, small granular | 25 lbs | per 1,000 gallons | 1–4 weeks |
| **Dominoes** | Cubes, medium slabs | 60 lbs | per 1,000 gallons | 2–8 weeks |
| **Mini Staves** | FNO (Fine Northern Oak, cross-cut) | 36 staves | per 1,000 gallons | weeks–months |
| **Tank Staves / Fan Staves** | Inner staves, full-size | 390 sq ft | per 1,000 gallons | months |

**Note on units:** Chips and Dominoes are measured by weight (lbs); Mini Staves by count; Tank/Fan Staves by surface area. The calculator UI should expose these per-format units rather than forcing a single unit across all formats.

---

## Toast Levels

Seven categories from the Codes sheet in Mike's spreadsheet:

| Code | Label | Notes |
|---|---|---|
| UT | **Untoasted** | Baseline, no thermal processing |
| LT | **Light** | Minimal toasting |
| MT | **Medium** | Standard commercial workhorse |
| MT+ | **Medium+** | Slightly more than medium; most common |
| HV | **Heavy** | Darker, more spice/smoke character |
| CON | **Connective / Savour** | AO (American Oak), oven-toasted style |
| EXT | **Extended** | FNO mini staves specifically; long/slow toast |

---

## % New Oak Equivalent

The central concept from the spreadsheet. Represents the fraction of total wine volume that is treated as 100% new oak. This normalizes across formats.

**Range from spreadsheet data:**
- **25%** — lightest examples (Bonterra Zin style)
- **50–75%** — typical Pinot Noir, Chardonnay, Cabernet Sauvignon
- **100%** — full treatment (California Blends, commercial blending lots)

**Consumer-facing intensity tiers (for the UI):**

| Label | % New Oak Range | Character |
|---|---|---|
| Subtle | 15–29% | Barely perceptible oak, freshness preserved |
| Moderate | 30–59% | Vanilla/spice integration, structure support |
| Full | 60–100% | Pronounced oak, complexity, longer integration time |

---

## Core Calculation Formula

```
gallons_to_treat = total_gallons × (new_oak_pct / 100)
quantity_needed  = gallons_to_treat × (addition_rate_per_1000 / 1000)
```

For chips/dominoes: `quantity_needed` is in **lbs**.  
For mini staves: `quantity_needed` is in **staves** — apply **ceiling** rounding (36.2 → 37).  
For tank staves: `quantity_needed` is in **sq ft**. The tool returns surface area only; it does not
convert to a stave count. Display this note alongside the result:
*"Check with your supplier for sq ft per stave."*

---

## Wine Types & Typical Profiles (from spreadsheet worksheets)

Each wine type in Mike's spreadsheet had its own sheet with batch-level calculations. Common types seen:

| Code | Wine | Typical Oak Treatment |
|---|---|---|
| BNCS | Bonterra CS (Cabernet Sauvignon) | Moderate–Full |
| PVCS | Parducci CS | Moderate–Full |
| CAME | CA Merlot blend | Moderate |
| BZ | Bonterra Zin | Subtle (25% new oak equiv.) |

---

## Supplier Reference (for Wine Supply page context)

Suppliers seen in spreadsheet data: Nadalie, Oenosylva / Nieuvre Merrain, Stavin, Oak Solutions, Innerstave, Canadell, Radoux.

---

## Build Decisions (✓ Resolved — Aug 28, 2026)

| # | Question | Decision |
|---|---|---|
| 1 | User-entered addition rates (expert mode)? | **No** — Mike's rates are fixed defaults. Expert mode deferred to Phase 2. |
| 2 | Contact time ranges by format? | **Use the "Typical Contact" column** in the Formats table above. |
| 3 | Tank staves — calculate stave count or input sq ft? | **Return sq ft only.** No count conversion. Display supplier note with result. |
| 4 | Printable batch sheet? | **No** — deferred to Phase 2 (save/print batch results). |
| 5 | Chips addition rate is a range (22–25 lbs) | **Fixed at 25 lbs** / 1,000 gal. Single value, not a range. |
| 6 | Intensity tier ranges had gaps (26–29%, 51–59%) | **Made contiguous:** Subtle 15–29 · Moderate 30–59 · Full 60–100. |
| 7 | Mini stave rounding | **Ceiling**, not nearest. |
