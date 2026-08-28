---
description: "Task list for Authentication, User Model & Role Gating"
---

# Tasks: Authentication, User Model & Role Gating

**Input**: Design documents from `/specs/001-auth-user-model/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Included. Each contract in `contracts/` carries an explicit "Test obligations" section,
and Constitution Principle III makes the gate-enforcement tests load-bearing rather than optional —
the test that a route handler refuses on its own is what prevents layout-only protection from
silently passing.

> **Session status (2026-08-28)** — Phases 1, 2 and the implementation halves of Phases 3–5 are
> complete and verified: `lint`, `typecheck`, `build` and the unit suite all pass. What remains is
> the test coverage that needs live Clerk and Supabase credentials (T021–T023, T030–T032, T039,
> T040), the manual dashboard configuration in T029, and Phase 6's T046–T048 and T052. `npm install`
> has not been run in this working copy — dependencies were resolved and the lockfile committed,
> but `node_modules` was deliberately not written across the device bridge.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: The user story this task serves (US1, US2, US3)

## Path Conventions

Single Next.js application at the repository root, per the Structure Decision in plan.md.
Paths below are repository-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stand the application up. The existing static site stays in place — see T004.

- [x] T001 Scaffold Next.js 16 at the repository root with `create-next-app` (TypeScript, App Router, Tailwind, ESLint, no `src/` directory), merging into the existing repo rather than creating a subdirectory
- [x] T002 Install runtime dependencies: `@clerk/nextjs@^7.8`, `@supabase/supabase-js@^2.112`, `zod`
- [x] T003 [P] Install dev dependencies and wire scripts in `package.json`: `vitest`, `@playwright/test`, plus `test`, `test:e2e`, and `typecheck` scripts
- [x] T004 Preserve the live static site: confirm `index.html`, `CNAME` and `assets/` are untouched, and add `index.html` and `CNAME` to `.eslintignore` so the Next.js lint pass ignores them
- [x] T005 [P] Set TypeScript to strict in `tsconfig.json` and confirm `npx tsc --noEmit` passes on the bare scaffold
- [x] T006 [P] Write `.env.example` with every variable from `quickstart.md` §1, and verify `.env.local` is covered by `.gitignore`
- [x] T007 [P] Write `.gitignore` additions for `node_modules`, `.next`, `.vercel`, `test-results`, `playwright-report`

**Checkpoint**: `npm run dev` serves a default Next.js page; the static site files are still intact.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Identity, database and the guard itself. Nothing in Phase 3+ can begin until this is
done — every user story depends on `requireRole()` existing.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [x] T008 Implement Zod-validated environment access in `lib/env.ts`, failing fast at boot with a named error per missing variable (quickstart §1)
- [x] T009 [P] Declare `CustomJwtSessionClaims { role?: string; tier?: string }` in `types/globals.d.ts` (research R-004)
- [x] T010 Create `proxy.ts` at the repository root with bare `clerkMiddleware()` and the matcher from research R-002 — including the `/__clerk/(.*)` entry. Do **not** use `createRouteMatcher` (R-001)
- [x] T011 Add `<ClerkProvider>` **inside** `<body>` in `app/layout.tsx`, with `<Show when="signed-in">` / `<Show when="signed-out">` header chrome (R-009)
- [x] T012 [P] Write `supabase/migrations/0001_users.sql`: the three enums, the `users` table, its CHECK constraints, indexes, `updated_at` trigger, RLS enabled, and the read-own-row policy (data-model)
- [x] T013 [P] Write `supabase/migrations/0002_role_changes.sql`: the `role_changes` table with FK `ON DELETE RESTRICT`, its index, and RLS enabled with **no** policy for `authenticated` (data-model)
- [x] T014 [P] Write `supabase/config.toml` with the `[auth.third_party.clerk]` block (R-005)
- [x] T015 Implement `lib/supabase/server.ts` — `createServerSupabaseClient()` using the publishable key and the `accessToken` callback returning `(await auth()).getToken()` (R-007)
- [x] T016 Implement `lib/supabase/admin.ts` — `createAdminSupabaseClient()` using `SUPABASE_SECRET_KEY`, with a file-header comment stating it bypasses RLS and is permitted only in the webhook handler and admin actions, and never combined with `accessToken`
- [x] T017 [P] Implement `lib/auth/roles.ts` — the `Role` and `Tier` unions, tier ordinal ordering, `tierFromRole()`, and `recomputeEntitlement()` as specified in data-model
- [x] T018 Implement `lib/auth/sync-user.ts` — idempotent upsert on `clerk_user_id`, used by both the webhook and the lazy fallback (R-008)
- [x] T019 Implement `lib/auth/require-role.ts` to the signature and behavioural contract in [contracts/role-guard.md](./contracts/role-guard.md): discriminated result, no permissive branch, fails closed, admin from `ADMIN_CLERK_USER_ID`, claim fast path with Supabase fallback and lazy upsert (depends on T015, T017, T018)
- [x] T020 [P] Write unit tests in `tests/unit/roles.test.ts` covering tier ordering for every pair, and an unrecognised role resolving to `free` rather than passing
- [ ] T021 [P] Write unit tests in `tests/unit/require-role.test.ts` covering each failure discriminant and asserting no error escapes the function (contracts/role-guard.md test obligations)

**Checkpoint**: Migrations apply, `requireRole()` is unit-tested, and the app boots with Clerk
mounted. User stories can now proceed.

---

## Phase 3: User Story 1 — Create an account and sign in (Priority: P1) 🎯 MVP

**Goal**: A visitor can register, verify their email, sign in, sign out, and reset a forgotten
password, and a `users` row exists for them.

**Independent Test**: Register a brand-new email, verify it, sign out, sign back in, reset the
password. Confirm one `users` row with `registered` / `free` / `none`. Delivers a working account
system with no gated content required.

### Tests for User Story 1

- [ ] T022 [P] [US1] Contract tests for the webhook in `tests/contract/clerk-webhook.test.ts`: invalid signature → 400 with no write; duplicate `user.created` → one row; `user.updated` carrying a `role` field leaves stored role unchanged; `user.deleted` sets `is_active=false`; unknown event → 200 with no write ([contracts/clerk-webhook.md](./contracts/clerk-webhook.md))
- [ ] T023 [P] [US1] E2E test in `tests/e2e/auth-flows.spec.ts` for quickstart V-1 steps 1–6, including the enumeration-safety assertion that reset confirmation text is identical for registered and unregistered addresses

### Implementation for User Story 1

- [x] T024 [P] [US1] Create `app/auth/sign-in/[[...sign-in]]/page.tsx` rendering Clerk's `<SignIn />`, honouring a validated same-origin `return_to` query parameter (FR-006)
- [x] T025 [P] [US1] Create `app/auth/sign-up/[[...sign-up]]/page.tsx` rendering Clerk's `<SignUp />`
- [x] T026 [US1] Implement `app/api/webhooks/clerk/route.ts` using `verifyWebhook()` from `@clerk/nextjs/webhooks`, handling `user.created` / `user.updated` / `user.deleted` per [contracts/clerk-webhook.md](./contracts/clerk-webhook.md), writing through the admin client (depends on T016, T018)
- [x] T027 [US1] Port the landing page from `index.html` into `app/page.tsx`, reusing `assets/` and adding sign-in / sign-up entry points. Do not delete `index.html` — it remains the source of record until the Vercel cutover
- [x] T028 [P] [US1] Create `app/about/page.tsx` from the About content in the architecture doc
- [ ] T029 [US1] Confirm in the Clerk dashboard that password strength and breached-password rejection are enabled, and record the setting in `quickstart.md` §2 (FR-002)

**Checkpoint**: US1 is independently demonstrable — a person can hold an account end to end.

---

## Phase 4: User Story 2 — Access matches entitlement (Priority: P1)

**Goal**: Free, subscriber-only and admin-only resources are enforced server-side, by URL and by
direct data call, for every principal.

**Independent Test**: Walk the V-2 matrix in `quickstart.md` as each of the four principals, using
direct URL entry and hard refresh, then bypass the UI and call the gated handler and admin action
directly.

**Depends on**: Phase 2 (the guard). Does **not** depend on US1's landing-page work.

### Tests for User Story 2

- [ ] T030 [P] [US2] E2E test in `tests/e2e/gating.spec.ts` asserting the full V-2 principal × route matrix, including that an admin refusal returns 404 rather than 403 (FR-015)
- [ ] T031 [P] [US2] Contract test in `tests/contract/handler-guard.test.ts` that calls the gated route handler directly with a non-admin session and asserts refusal **at the handler** — this test must fail if the handler's own guard call is removed, even while the layout guard remains (contracts/role-guard.md)
- [ ] T032 [P] [US2] Test in `tests/e2e/fail-closed.spec.ts` for quickstart V-5: with Supabase unreachable, a Founder requesting a gated page gets the service-unavailable state, not content (FR-016)

### Implementation for User Story 2

- [x] T033 [US2] Create the `app/(subscriber)/layout.tsx` route-group guard calling `requireRole({ minTier: 'vintner' })`, redirecting on `unauthenticated`, rendering the upgrade prompt on `insufficient_tier`, and the unavailable state on `unavailable`
- [x] T034 [P] [US2] Create `app/(subscriber)/oak-calculator/page.tsx` as a guarded placeholder — the calculator itself is a later slice; this exists so the gate has a real subject
- [x] T035 [P] [US2] Build the upgrade prompt component in `components/upgrade-prompt.tsx`, naming what the subscription includes and linking to `/pricing` (FR-015)
- [x] T036 [P] [US2] Build the service-unavailable component in `components/service-unavailable.tsx` (FR-016)
- [x] T037 [US2] Create `app/admin/layout.tsx` calling `requireRole({ role: 'admin' })` and calling `notFound()` on refusal, so admin existence is never disclosed
- [x] T038 [US2] Add `revalidate = 0` / dynamic rendering to guarded segments so a gate decision is never served from a static or cached render — a cached gated page defeats FR-014

**Checkpoint**: The gate holds for every principal, by URL and by direct call.

---

## Phase 5: User Story 3 — Grant a Founder comp account (Priority: P2)

**Goal**: The administrator can find a person by email, grant and revoke Founder with a chosen
tier, and every change is audited.

**Independent Test**: Create a second ordinary account, grant it Founder from `/admin/users`,
confirm `/oak-calculator` opens for it without signing out, revoke, confirm it closes again.

**Depends on**: Phase 2, and US2's admin layout guard (T037).

### Tests for User Story 3

- [ ] T039 [P] [US3] Contract tests in `tests/contract/admin-actions.test.ts`: non-admin caller → `forbidden` with no write; self-demotion → `forbidden`; a successful grant produces exactly one `users` update and one `role_changes` row with correct `from_*`; `revokeFounder` on a non-Founder → `not_founder` with no write ([contracts/admin-actions.md](./contracts/admin-actions.md))
- [ ] T040 [P] [US3] E2E test in `tests/e2e/founder-grant.spec.ts` for quickstart V-3, including step 3's assertion that the target's access changes **without** signing out (FR-014, SC-003)

### Implementation for User Story 3

- [x] T041 [US3] Implement the shared admin-action preamble in `app/admin/users/actions.ts`: `requireRole({ role: 'admin' })` first, then the self-demotion refusal, then Zod validation — placed once so a future action cannot omit it (FR-020)
- [x] T042 [US3] Implement `listUsers` per [contracts/admin-actions.md](./contracts/admin-actions.md), reading through the admin client with case-insensitive email search and cursor pagination (FR-017)
- [x] T043 [US3] Implement `grantFounder`: default tier `cellar_master`, reject `free`, write `users` and `role_changes` in one transaction, update Clerk metadata so the session claim converges, `revalidatePath('/admin/users')` (FR-010, FR-019)
- [x] T044 [US3] Implement `revokeFounder` via `recomputeEntitlement()` rather than literal resets, with the same audit and revalidation obligations (FR-021)
- [x] T045 [US3] Build `app/admin/users/page.tsx` — the user list with email, role, tier, entitlement source and sign-up date, an email search box, and grant/revoke controls with a tier selector and optional reason field (FR-017, FR-018)
- [ ] T046 [P] [US3] Render the per-user `role_changes` history on the admin user row, so the audit trail is visible rather than only stored (FR-019)

**Checkpoint**: Mike can onboard a Founder end to end. Phase 1's private beta is unblocked.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T047 [P] Add structured server-side logging for every guard refusal and every admin mutation — actor, target, decision — without logging tokens or emails at debug level
- [ ] T048 [P] Measure gate latency against SC-007 and record the median in `quickstart.md`; if it exceeds 100ms, the claim fast path is not being hit and R-004 needs revisiting
- [x] T049 [P] Update the root `README.md`: the repo now holds a Next.js app alongside the static site, with the branch/cutover situation explained
- [x] T050 [P] Write `docs/vercel-cutover.md` — the steps to point wnmkr.ai at Vercel and retire the GitHub Pages deployment, explicitly **not** performed in this slice
- [ ] T051 Run the full gate: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm test`, `npm run test:e2e`
- [ ] T052 Re-read [checklists/requirements.md](./checklists/requirements.md) against the built code and correct any place the spec and the implementation have drifted — the spec is amended, not the record left stale (Constitution Principle I)

---

## Review findings (2026-08-28)

An adversarial review of the implemented slice found twelve defects. Seven were fixed on this
branch, with `research.md`, `plan.md`, `data-model.md` and the contracts amended to match:

- [x] R-1 Session-claim fast path could leave a revoked Founder permanently entitled when the
      Clerk metadata write failed — removed; entitlement is read from Postgres every request
- [x] R-2 `is_active` was enforced on the database path and skipped on the claim path
- [x] R-3 `safeReturnTo` open redirect via backslash and control characters (`/\evil.com`)
- [x] R-4 `users` update and `role_changes` insert were not transactional; a grant could commit
      with no audit row and still report success — now one `set_user_entitlement` function
- [x] R-5 `returnTo` was hardcoded to `/` and never read; the layout built it from an unvalidated
      header instead — the guard now captures and validates it
- [x] R-6 Authorization ran after input validation in `grantFounder` and `revokeFounder`
- [x] R-7 `email NOT NULL` permanently locked out identities with no email; webhook write failures
      returned 200 so Clerk never retried
- [x] R-8 No optimistic concurrency on entitlement writes — `p_expected_role` added
- [x] R-11 `listUsers` reported a database failure as `not_found` and had no pagination
- [x] R-12 Webhook stored an arbitrary, possibly unverified email address

Two are documented rather than code-fixed, and are follow-up work:

- [ ] R-9 `Principal.email` is now always populated (the fast path that emptied it is gone) — verify with a contract test
- [ ] R-10 Layout guards are backstops, not the control: every page in a guarded group must call
      `requireRole()` itself. Done for `/oak-calculator`; must hold for every page added later

---

## Dependencies

```
Phase 1 (Setup)
   └─> Phase 2 (Foundational)  ← blocking for everything
          ├─> Phase 3 (US1)  ─┐
          ├─> Phase 4 (US2)  ─┤  US1 and US2 are independent of each other
          │                   │
          └─> Phase 5 (US3)  ←┘  needs T037 from US2
                 └─> Phase 6 (Polish)
```

Within Phase 2: T019 depends on T015, T017, T018. T015 and T016 depend on T008.
Within Phase 5: T042–T044 depend on T041. T045 depends on T042–T044.

## Parallel execution opportunities

- **Phase 1**: T003, T005, T006, T007 together.
- **Phase 2**: T012, T013, T014 (three separate files) together; then T009, T017 together; then
  T020, T021 together once T019 lands.
- **Phase 3**: T022, T023 together; T024, T025, T028 together.
- **Phase 4**: T030, T031, T032 together; T034, T035, T036 together.
- **Phase 5**: T039, T040 together; T046 alongside T045.
- **Phase 6**: T047–T050 all together.

## Implementation strategy

**MVP is Phase 1 + Phase 2 + Phase 3 (US1).** That yields a real account system on real
infrastructure — enough to demonstrate and to hand to a first tester, even with nothing gated yet.

**Second increment is Phase 4 (US2)**, which turns the tiers from data into enforcement. At that
point the subscription product is defensible.

**Third increment is Phase 5 (US3)**, which is what actually delivers Phase 1 to its Founders,
since payment is out of scope here.

Phase 6 is not optional polish. T051 is the constitution's commit gate and T052 is Principle I's
requirement that the spec never trails the code.
