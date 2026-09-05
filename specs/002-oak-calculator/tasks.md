# Tasks: Oak Addition Calculator — Multi-Line Worksheet

**Branch**: `002-oak-calculator` | **Date**: 2026-09-04
**Input**: `specs/002-oak-calculator/` (spec.md, plan.md, research.md, data-model.md, contracts/worksheet.md, quickstart.md)

**Tests**: Unit tests for `calculate.ts` are included (plan.md specifies Vitest). Component and integration tests are not requested — manual acceptance per `quickstart.md`.

**Organization**: Setup and foundational phases first; then one phase per user story (P1→P4 priority order); polish last.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: User story this task belongs to (US1–US4 from spec.md)
- Exact file paths are included in every description

---

## Phase 1: Setup

**Purpose**: Create the `lib/oak-calculator/` module with shared types and reference data. These files have no dependencies and can both start immediately.

- [ ] T001 Create `lib/oak-calculator/types.ts` — define all TypeScript types from data-model.md: `OakFormat`, `ToastLevel`, `OakType`, `ShareTotalState`, `WorksheetHeader`, `LineItem`, `WorksheetState`, `WorksheetAction` (discriminated union), `LineResult`, `WorksheetDerived`, `FormatConfig`, `ToastConfig`, `OakTypeConfig`
- [ ] T002 [P] Create `lib/oak-calculator/reference-data.ts` — export `FORMAT_CONFIG: Record<OakFormat, FormatConfig>` (chips 25 lbs, dominoes 60 lbs, mini-staves 135.59 staves, tank-staves 390 sq ft; add inline comment on mini-staves: "From catalog product OC1 — only mini stave product in source workbook; no blend sheet verified this rate in production; confirm with Mike"); export `TOAST_CONFIG: ToastConfig[]` in display order (UT, LT, M, M+, H, CON, EXT); export `OAK_TYPE_CONFIG: OakTypeConfig[]` (french, american, east-european, other)

---

## Phase 2: Foundational

**Purpose**: Calculation engine, unit tests, and the auth-gated server page. All user story phases depend on this phase completing first.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Implement `lib/oak-calculator/calculate.ts` — export `deriveWorksheet(header: WorksheetHeader, lines: LineItem[]): WorksheetDerived` and `calculateLine(gallonsToTreat: number, line: LineItem): LineResult | null`; implement per contracts/worksheet.md Section 2 exactly: shareTotal sum, shareTotalState comparison, three-step formula (`gallons_to_treat → line_gallons → Math.ceil(line_gallons × ratePerThousand / 1000)`), canDisplay/canPrint gating; never throws; returns null from calculateLine when format null or sharePct null or sharePct < 1
- [ ] T004 [P] Write Vitest unit tests in `lib/oak-calculator/calculate.test.ts` — test all eleven rows in quickstart.md Calculation Reference Table as individual test cases; also cover: exact-integer inputs produce unchanged ceiling (e.g. `Math.ceil(25.0) = 25`), fractional inputs round up (e.g. `Math.ceil(162.708) = 163`), calculateLine returns null for null format/sharePct, deriveWorksheet returns empty lineResults when shareTotalState !== 'valid', canDisplay false when header invalid, canPrint false when varietal empty even if canDisplay true; all tests must pass before T003 is considered done
- [ ] T005 Replace `app/(subscriber)/oak-calculator/page.tsx` stub with production server component — call `requireRole({ minTier: 'vintner' })`; branch on result: `unauthenticated` → `redirect('/auth/sign-in?return_to=/oak-calculator')`, `insufficient_tier` → render `<UpgradePrompt required={result.required} />`, `unavailable` → render `<ServiceUnavailable />`; on `ok` → render a page shell containing `<Worksheet />`; do NOT pass session, principal, or any auth state to `<Worksheet />`; per contracts/worksheet.md Section 1 and Constitution Principle III

**Checkpoint**: Foundation ready. `npm run lint && npx tsc --noEmit` must pass. `calculate.test.ts` tests must all pass. User story phases can now begin.

---

## Phase 3: User Story 1 — Single-Product Work Order (Priority: P1) 🎯 MVP

**Goal**: A Subscriber fills the batch header, adds one product line at 100% share, and immediately sees the computed quantity. The share indicator shows "100% — Complete" and the quantity and batch summary appear.

**Independent Test**: quickstart.md Scenario 1 — navigate to /oak-calculator as Subscriber; enter volume 2,000, varietal "Cabernet Sauvignon", target 50%; add one line: Chips/Beans · M+ · French · "Nadalie" · 100% share; **expected**: share indicator "100% — Complete" (green), line quantity 25 lbs, batch summary shows "2,000 gal · Cabernet Sauvignon · 50% new oak · 1,000 gal to treat".

### Implementation for User Story 1

- [ ] T006 [P] [US1] Create `components/oak-calculator/worksheet-header.tsx` — three inputs: volume (`type="number"` min=1 max=1000000), varietal (`type="text"`), targetPct (`type="number"` min=1 max=100 integer step); each `onChange` calls `onHeaderChange(field, value)`; shows required-field indicator when field is empty and user has touched it; no comma formatting in the raw input (comma formatting is display-only in BatchSummary); prop types match `WorksheetHeader` contract
- [ ] T007 [P] [US1] Create `components/oak-calculator/share-total-indicator.tsx` — receives `{ shareTotal: number, state: ShareTotalState }`; renders labeled indicator using BOTH color and text (never color alone — FR-010); incomplete → amber + `"{shareTotal}% — Incomplete"`; valid → green + `"100% — Complete"`; over → red + `"{shareTotal}% — Over 100%"`; apply `print:hidden` to its container
- [ ] T008 [P] [US1] Create `components/oak-calculator/batch-summary.tsx` — receives `{ header: WorksheetHeader, gallonsToTreat: number }`; rendered by parent (Worksheet) only when `derived.canDisplay === true`; displays volume via `toLocaleString('en-US')`, varietal, targetPct with "% new oak", gallonsToTreat via `toLocaleString('en-US')` + "gal to treat"; this element is NOT hidden in print
- [ ] T009 [P] [US1] Create `components/oak-calculator/line-item.tsx` — receives `{ line: LineItem, result: LineResult | null, onUpdate, onRemove }`; renders format `<select>` (four options from FORMAT_CONFIG labels), toast `<select>` (seven options from TOAST_CONFIG), oak type `<select>` (four options from OAK_TYPE_CONFIG), supplier `<input type="text">`, sharePct `<input type="number" min=1 step=1>`; result area: when result non-null show quantity + unit, when tank-staves also show supplierNote below quantity, when result null show nothing (not a dash or placeholder); remove button has `print:hidden`; interactive controls have `print:hidden`
- [ ] T010 [US1] Create `components/oak-calculator/line-item-list.tsx` — receives `{ lines, lineResults, onAddLine, onUpdateLine, onRemoveLine }`; maps `lines` to `<LineItem>` components keyed by `line.id`; resolves each line's result by finding the matching `LineResult` from `lineResults` where `lineResult.lineId === line.id`, or passes `null` if no match (e.g. when `canDisplay` is false); "Add line" `<button>` has `print:hidden`; calls `onAddLine` on click
- [ ] T011 [P] [US1] Create `components/oak-calculator/print-button.tsx` — receives `{ canPrint: boolean }`; renders a button that calls `window.print()` on click; when `canPrint` is false the button is visually disabled and has `aria-disabled="true"` and click handler does nothing; apply `print:hidden` to the button
- [ ] T012 [US1] Create `components/oak-calculator/worksheet.tsx` — `'use client'`; owns all state via `useReducer(worksheetReducer, initialState)` where `initialState = { header: { volumeGallons: null, varietal: '', targetPct: null }, lines: [] }`; implement `worksheetReducer` handling all five action types (SET_HEADER updates header field, ADD_LINE appends empty LineItem with `id: crypto.randomUUID()`, UPDATE_LINE patches matching line, REMOVE_LINE filters out matching line, RESET returns initialState); calls `deriveWorksheet(state.header, state.lines)` on every render; renders: `<WorksheetHeader>`, `<ShareTotalIndicator>`, `<LineItemList>`, `<BatchSummary>` (only when `derived.canDisplay`), `<PrintButton>`; accepts no props; stores no auth state; never mutates state

**Checkpoint**: After T012, start dev server, navigate to /oak-calculator as a Subscriber, and complete quickstart.md Scenario 1. All six expected values must be correct before proceeding.

---

## Phase 4: User Story 2 — Multi-Line Split Treatment (Priority: P2)

**Goal**: Multiple product lines each claiming a share of the treatment. Share indicator transitions through all three states as lines are added and edited. Quantities appear only when the total is exactly 100%. Deleting a line immediately recalculates.

**Independent Test**: quickstart.md Scenario 2 — header: 5,000 gal / Pinot Noir / 60%; Line 1: Chips/Beans · M · French · "Radoux" · 60%; Line 2: Mini Staves · EXT · French · "Innerstave" · 40%; **expected**: indicator "100% — Complete", Line 1 45 lbs, Line 2 163 staves. Then Scenario 6: delete Line 2 → indicator "60% — Incomplete", quantities clear.

### Implementation for User Story 2

The multi-line behavior is fully inherent in the Phase 3 architecture — the reducer, `deriveWorksheet`, and component contracts support N lines from the start. US2 tasks verify that the wiring is correct end-to-end and harden two specific behaviors:

- [ ] T013 [US2] Harden quantity and summary gating in `components/oak-calculator/worksheet.tsx` — verify that `derived.lineResults` is always `[]` when `derived.shareTotalState !== 'valid'` (check that `deriveWorksheet` is called on every render, not memoized in a way that skips updates); verify `<BatchSummary>` unmounts when `derived.canDisplay` becomes false (e.g. after a line deletion drops the share total); run quickstart.md Scenarios 2, 4, and 6 to confirm all three indicator states and quantity-gating transitions
- [ ] T014 [P] [US2] Harden result-to-line matching in `components/oak-calculator/line-item-list.tsx` — confirm that when `canDisplay` is false the `lineResults` array passed in is `[]` and all LineItem components receive `result={null}`; confirm that when a line's required fields are incomplete (format null, sharePct null) `calculateLine` returns null and that line's result renders as empty; verify via quickstart.md Scenario 4 states 1 and 2

**Checkpoint**: After T014, quickstart.md Scenarios 2, 4, and 6 must all produce correct expected values with no console errors.

---

## Phase 5: User Story 3 — Print Cellar Work Order (Priority: P3)

**Goal**: A valid completed worksheet prints as a cellar work order. Screen-only elements (share indicator, interactive controls, navigation, add/remove buttons) are hidden. Work-order content (batch header, all lines with quantities, advisory note) prints correctly.

**Independent Test**: quickstart.md Scenario 5 — set up a valid two-line worksheet; verify print button is active; click print; verify print preview shows batch header, all lines with quantities, Tank Staves supplier note, and the toast advisory note; verify indicator and interactive controls are absent from print preview.

### Implementation for User Story 3

- [ ] T015 [US3] Apply `print:hidden` to all screen-only elements — `components/oak-calculator/share-total-indicator.tsx` container, "Add line" button in `line-item-list.tsx`, remove button and all form controls (`<select>`, `<input>`) in `line-item.tsx`, `<PrintButton>` itself; ensure that the label/display portions of line items (format label, toast code, oak type, supplier, share %, quantity) are NOT hidden
- [ ] T016 [US3] Add the toast advisory note to `components/oak-calculator/worksheet.tsx` — render the paragraph "Verify toast availability with your supplier — not all toast levels are offered in every format or oak type." below the line item list; this element must be visible in print and can be displayed as secondary text on screen; per FR-022
- [ ] T017 [P] [US3] Verify print layout renders correct work-order content — in browser print preview confirm: batch header (comma-formatted volume, varietal, target %, gallons to treat) is visible; each line shows format label, toast code, oak type, supplier, share %, quantity with unit; Tank Staves lines show supplier note; advisory note is visible; no interactive chrome (inputs, selectors, buttons, nav) appears; run quickstart.md Scenario 5 step by step

**Checkpoint**: After T017, quickstart.md Scenario 5 checklist items must all be verified in print preview.

---

## Phase 6: User Story 4 — Access Control (Priority: P4)

**Goal**: Auth gate works correctly for all account states. The server-side guard is the enforcement mechanism — client component holds no auth data.

**Independent Test**: quickstart.md Scenario 7 — three accounts: anonymous visitor redirected to /auth/sign-in with return_to preserved; free-tier user sees upgrade prompt and no worksheet; Subscriber sees empty worksheet immediately.

### Implementation for User Story 4

The auth guard was implemented in T005. US4 is validation of all three paths:

- [ ] T018 [US4] Validate all three auth paths per quickstart.md Scenario 7 — (1) open private/incognito browser, navigate to /oak-calculator, verify redirect to `/auth/sign-in?return_to=%2Foak-calculator`; (2) log in as `tier = 'free'` user, navigate to /oak-calculator, verify UpgradePrompt renders and worksheet does not render; (3) log in as `tier = 'vintner'` user, navigate to /oak-calculator, verify empty worksheet renders immediately with no auth data visible in React DevTools

**Checkpoint**: After T018, all three Scenario 7 steps pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates, test suite confirmation, and full quickstart validation.

- [ ] T019 [P] Run `npm run lint && npx tsc --noEmit && npm run build` from repo root — fix all lint violations, TypeScript errors, and build failures; ensure strict mode compliance in all new files (`lib/oak-calculator/`, `components/oak-calculator/`, `app/(subscriber)/oak-calculator/`); any `any` requires an inline justification comment per Constitution technology constraints
- [ ] T020 [P] Run `npx vitest run lib/oak-calculator/calculate.test.ts` — confirm all test cases pass; if any fail, fix the implementation in `calculate.ts` until all pass
- [ ] T021 Run quickstart.md acceptance scenarios 1–7 end-to-end against the dev server — check off each expected value; log any discrepancy as a bug; additionally: (a) time Scenario 1 from page load to result display and confirm it completes in under 90 seconds (SC-001); (b) after completing any valid worksheet, change one header or line value and confirm quantities update with no perceptible delay (SC-002: target < 1 second, trivially met by synchronous in-memory arithmetic); every scenario must pass before this task is marked complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately; T001 and T002 can run in parallel
- **Phase 2 (Foundational)**: Depends on Phase 1 completing — BLOCKS all user story phases
  - T003, T004, T005 can all start once Phase 1 is done; T003 and T004 are independent
- **Phase 3 (US1)**: Depends on Phase 2 — T006–T009, T011 can run in parallel; T010 depends on T009's type signatures; T012 depends on T006–T011
- **Phase 4 (US2)**: Depends on Phase 3 completing (T013 and T014 need all Phase 3 components wired)
- **Phase 5 (US3)**: Depends on Phase 3 (needs all components to apply print:hidden and verify print layout)
- **Phase 6 (US4)**: Depends on Phase 2 T005 — can technically proceed before Phases 3–5 complete
- **Phase 7 (Polish)**: Depends on Phases 3–6 completing

### Within Phase 3

```
T006 [P] worksheet-header.tsx  ──┐
T007 [P] share-total-indicator.tsx ──┤
T008 [P] batch-summary.tsx     ──┤── T010 line-item-list.tsx ── T012 worksheet.tsx
T009 [P] line-item.tsx         ──┤
T011 [P] print-button.tsx      ──┘
```

### Parallel Opportunities

- **Phase 1**: T001 and T002 in parallel
- **Phase 2**: T003, T004, T005 in parallel (T004 tests T003, so T003 must be done first for passing tests)
- **Phase 3**: T006, T007, T008, T009, T011 all in parallel; T010 after T009; T012 after all
- **Phase 7**: T019 and T020 in parallel; T021 after both

---

## Parallel Example: Phase 3 (US1)

```
# Start these five simultaneously:
Task: "Create components/oak-calculator/worksheet-header.tsx"       # T006
Task: "Create components/oak-calculator/share-total-indicator.tsx"  # T007
Task: "Create components/oak-calculator/batch-summary.tsx"          # T008
Task: "Create components/oak-calculator/line-item.tsx"              # T009
Task: "Create components/oak-calculator/print-button.tsx"           # T011

# After T009 is done:
Task: "Create components/oak-calculator/line-item-list.tsx"         # T010

# After T006–T011 are all done:
Task: "Create components/oak-calculator/worksheet.tsx"              # T012
```

---

## Implementation Strategy

### MVP Scope (User Story 1 Only)

1. Complete Phase 1: Setup (T001, T002)
2. Complete Phase 2: Foundational (T003, T004, T005) — MUST pass tests
3. Complete Phase 3: User Story 1 (T006–T012)
4. **STOP and VALIDATE**: Run quickstart.md Scenario 1; confirm 25 lbs appears
5. If MVP is sufficient, stop here

### Incremental Delivery

1. Setup + Foundational → Module and auth shell complete
2. User Story 1 → Single-product calculation works (MVP)
3. User Story 2 → Multi-line and share constraint validated
4. User Story 3 → Browser print and work order complete
5. User Story 4 → Auth paths verified
6. Polish → Quality gates pass; all 7 scenarios validated

### Single-Developer Sequence

Phase 1 → Phase 2 → Phase 3 (T006–T009, T011 in parallel, then T010, then T012) → Phase 4 → Phase 5 → Phase 6 → Phase 7

---

## Notes

- **No new dependencies**: All functionality uses Next.js, React, Tailwind — nothing to install
- **No Supabase writes**: Worksheet state is ephemeral; no database calls in this feature
- **Reference data is final after T002**: Any change to a rate or code in `reference-data.ts` requires re-running affected test cases in `calculate.test.ts`
- **Print stylesheet is Tailwind-only**: No separate CSS file; `print:hidden` and `print:block` utilities only
- **Auth guard runs twice by design**: `(subscriber)/layout.tsx` is the first layer; `page.tsx` (T005) is the independent second check per Constitution Principle III
- **Mini stave rate**: 135.59 staves/1,000 gal from catalog product OC1; unverified in production blend sheets — the inline comment in `reference-data.ts` is the audit trail
