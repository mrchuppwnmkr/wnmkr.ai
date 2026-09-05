# Implementation Plan: Oak Addition Calculator

**Branch**: `002-oak-calculator` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-oak-calculator/spec.md`

## Summary

Replace the placeholder page at `/oak-calculator` with a multi-line oak addition worksheet. The winemaker fills a batch header (volume in gallons, varietal, target % new oak), adds one or more product lines (format, toast level, oak type, supplier, share %), and sees per-line quantities update live. A running share-total indicator enforces the 100% constraint — quantities and the print action are gated until shares are exactly 100% and all required fields are filled. The completed worksheet prints as a cellar work order via the browser's native print dialog. No data is persisted; all state is session-local. Auth gate is already present in both the `(subscriber)` group layout and the page stub at `minTier: 'vintner'`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node 20 LTS

**Primary Dependencies**: Next.js 15 App Router, React 19, Tailwind CSS, Clerk (auth), Supabase (entitlement lookup — no writes for this feature). No additional libraries required.

**Storage**: None — worksheet state is held entirely in React component state (useReducer). Nothing is written to Supabase, localStorage, or any external system.

**Testing**: Vitest — unit tests for the pure calculation functions in `lib/oak-calculator/calculate.ts`. Manual acceptance testing per `quickstart.md`. Print output verified visually.

**Target Platform**: Web (Vercel), modern browsers. Print via `@media print` CSS — no PDF or server-side rendering.

**Project Type**: Web application — Next.js App Router with server/client component split.

**Performance Goals**: Share total and quantities update within 100ms of any input change (pure in-memory arithmetic, no network call). Print dialog opens immediately on user action.

**Constraints**: No persistence. No cost/pricing data. No product catalog or SKU lookup. All format rates are fixed constants from `claude/oak-calculator-reference.md`. Print via browser only — no PDF generation.

**Scale/Scope**: Single page, one server component (auth shell), one root client component managing a header + N line items (N unbounded but practically 1–10).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Delivery | PASS | `specs/002-oak-calculator/` carries spec → plan → tasks before any code merges |
| II. Production-Lite | PASS | Auth check runs against real Supabase + Clerk on every page load. No stubs. |
| III. Deny by Default | PASS | `(subscriber)/layout.tsx` guards the route group. Page stub re-checks with `requireRole({ minTier: 'vintner' })`. Client component receives no auth data — it only holds user-entered worksheet inputs. |
| IV. Domain Values Sourced | PASS | All four addition rates, all seven toast codes, formula, and rounding rule trace to `claude/oak-calculator-reference.md`. No invented constants. |
| V. Cost Ceilings | N/A | No Anthropic API calls in this feature. |

## Project Structure

### Documentation (this feature)

```text
specs/002-oak-calculator/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── worksheet.md     # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
app/
└── (subscriber)/
    └── oak-calculator/
        └── page.tsx                    # Server component — auth check (REPLACE STUB)

components/
└── oak-calculator/
    ├── worksheet.tsx                   # 'use client' — root state (useReducer), orchestrates all children
    ├── worksheet-header.tsx            # Volume, varietal, target % inputs
    ├── line-item-list.tsx              # Renders LineItem rows + "Add line" button
    ├── line-item.tsx                   # Single line: format/toast/oak-type/supplier/share inputs + result
    ├── share-total-indicator.tsx       # Running total with three labeled states
    ├── batch-summary.tsx               # Volume, varietal, target %, gallons to treat (shown when valid)
    └── print-button.tsx                # Calls window.print(); disabled when canPrint is false

lib/
└── oak-calculator/
    ├── types.ts                        # All shared TypeScript types
    ├── reference-data.ts               # FORMAT_CONFIG, TOAST_CONFIG, OAK_TYPE_CONFIG
    └── calculate.ts                    # deriveWorksheet(), calculateLine()
```

**Print stylesheet**: `@media print` rules applied via Tailwind's `print:hidden` utilities on interactive/screen-only elements, and a `print:block` reveal on the work-order layout.

**Structure Decision**: Server page (auth shell) + single root client component (`Worksheet`) that holds all state. Children receive slices of state and dispatch callbacks via props — no context needed at this scale.

## Complexity Tracking

No constitution violations — no entry needed.
