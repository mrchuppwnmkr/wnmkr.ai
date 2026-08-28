# Implementation Plan: Authentication, User Model & Role Gating

**Branch**: `phase1-auth` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-auth-user-model/spec.md`

## Summary

Stand up the Next.js application in this repository and deliver the identity layer Phase 1 depends
on: Clerk-hosted sign-up, sign-in, email verification and password reset; a Supabase `users` table
that is the system of record for role and entitlement tier; a single `requireRole()` guard used by
protected segment layouts, route handlers and server actions alike; and an `/admin/users` screen
where the administrator grants and revokes the Founder comp role, with every change written to an
append-only audit table.

The approach is shaped by two findings from Phase 0. First, authorization lives at the resource
rather than in a middleware route-matcher (R-001), because Clerk has deprecated that pattern and
because matcher lists fail open on newly added routes. Second, Clerk and Supabase are joined by
Supabase Third-Party Auth (R-005), not by the deprecated JWT-template-plus-shared-secret approach
that most published examples still show.

## Technical Context

**Language/Version**: TypeScript (strict), Node.js ≥ 20.9.0

**Primary Dependencies**: Next.js 16.3.x (App Router) · React 19.2.x · `@clerk/nextjs` 7.8.x
(Core 3) · `@supabase/supabase-js` 2.112.x · Tailwind CSS · Zod for input validation

**Storage**: Supabase Postgres. Two tables in this slice — `users` and `role_changes` — both with
Row Level Security enabled.

**Testing**: Vitest for unit tests of the role-resolution logic; Playwright for the acceptance
scenarios that cross a session boundary (sign-up → verify → gated page). Contract tests for the
admin server actions.

**Target Platform**: Vercel (Node runtime), evergreen browsers.

**Project Type**: Web application — Next.js full stack, frontend and API routes in one deployment.

**Performance Goals**: Gate decision adds ≤100ms at the median (SC-007), achieved by reading the
role from the Clerk session claim on the hot path rather than querying Postgres per request.

**Constraints**: Custom session-token claims must stay under ~1.2KB or the session cookie silently
fails to set (R-004) — only `role` and `tier` go in the token. Role changes are visible within one
session-token refresh (<60s) on read paths, and immediately on admin paths, which reads from
Postgres directly.

**Scale/Scope**: 1–2 Founders at launch, low hundreds of accounts within Phase 1. Two database
tables, one guard module, four route groups, one admin screen. No payment integration in this
slice.

## Constitution Check

*GATE: evaluated against Constitution v1.1.0. Re-checked after Phase 1 design — see below.*

| Principle | Gate | Pre-design | Post-design |
|---|---|---|---|
| I. Spec-Driven Delivery | Feature has spec.md before code; artifacts live with the code | PASS — `spec.md` written and validated before any implementation | PASS — plan, research, data model, contracts, quickstart all committed on this branch |
| II. Production-Lite, Not Prototype | No auth stubs, no mock user store; works against real Clerk and Supabase | PASS — Clerk-hosted components and a real Supabase schema; no fixture layer | PASS — `quickstart.md` validates against live projects, not mocks |
| III. Deny by Default | Server-enforced at the resource; nothing client-only; undeclared access is denied | PASS — one `requireRole()` guard, called in every protected layout and independently in every handler | PASS — guard returns a discriminated result with no permissive default branch; unknown role maps to free tier |
| IV. Sourced Domain Values | No invented winemaking constants | PASS — not applicable, this slice contains no domain calculations | PASS — unchanged |
| V. Cost Ceilings Are Features | Anthropic API paths ship with their caps | PASS — not applicable, no model calls in this slice | PASS — the `tier` field this slice creates is the field the consultant's quota will read |

**Amendment triggered by this plan**: Principle III previously named middleware as an enforcement
point. Research R-001 established that Clerk deprecated that mechanism and directs authorization to
the resource. The constitution was amended to v1.1.0 on this branch before the gate was evaluated.
No violations remain, so the Complexity Tracking table is omitted.

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-user-model/
├── spec.md              # Phase -1 output (/speckit-specify)
├── plan.md              # This file (/speckit-plan)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── role-guard.md
│   ├── admin-actions.md
│   └── clerk-webhook.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
proxy.ts                          # Next 16 name for middleware; bare clerkMiddleware()

app/
├── layout.tsx                    # ClerkProvider inside <body>
├── page.tsx                      # Landing (ported from the existing index.html)
├── about/page.tsx
├── auth/
│   ├── sign-in/[[...sign-in]]/page.tsx
│   └── sign-up/[[...sign-up]]/page.tsx
├── (subscriber)/                 # Route group — guarded subtree
│   ├── layout.tsx                # requireRole({ minTier: 'vintner' })
│   └── oak-calculator/page.tsx   # Placeholder; real calculator is a later slice
├── admin/
│   ├── layout.tsx                # requireRole({ role: 'admin' })
│   └── users/
│       ├── page.tsx              # User list + search
│       └── actions.ts            # grantFounder / revokeFounder / setTier server actions
└── api/
    └── webhooks/clerk/route.ts   # verifyWebhook(); user.created/updated/deleted

lib/
├── auth/
│   ├── roles.ts                  # Role and Tier unions, ordering, tier-from-role mapping
│   ├── require-role.ts           # The single guard; used by layouts, handlers and actions
│   └── sync-user.ts              # Idempotent upsert; webhook path and lazy fallback
├── supabase/
│   ├── server.ts                 # createServerSupabaseClient() — RLS via Clerk accessToken
│   └── admin.ts                  # createAdminSupabaseClient() — service role, webhook only
└── env.ts                        # Zod-validated environment access; fails fast at boot

types/
└── globals.d.ts                  # CustomJwtSessionClaims { role, tier }

supabase/
├── config.toml                   # [auth.third_party.clerk]
└── migrations/
    ├── 0001_users.sql
    └── 0002_role_changes.sql

tests/
├── unit/roles.test.ts
├── contract/admin-actions.test.ts
└── e2e/auth-flows.spec.ts
```

**Structure Decision**: Single Next.js application at the repository root, App Router, with route
groups rather than separate frontend and backend projects — the stack decision puts API routes in
the same deployment, so a split would add a boundary that buys nothing. The `(subscriber)` route
group exists specifically so that one layout guard covers every current and future subscriber-only
page without each page needing to remember; this is the structural expression of Principle III.

The existing static site is left in place on this branch. `index.html`, `CNAME` and `assets/` are
not deleted — `assets/` is reused by the Next.js landing page, and `index.html` remains the source
of record for the landing copy until `main` is cut over to Vercel. Removing them is a task for the
cutover, not for this slice.

## Phase 1 Design Artifacts

- [data-model.md](./data-model.md) — `users` and `role_changes`, the role and tier enums, RLS
  policies, and the state transitions for a Founder grant.
- [contracts/role-guard.md](./contracts/role-guard.md) — the `requireRole()` signature, its
  discriminated return, and the caller obligations for layouts, handlers and actions.
- [contracts/admin-actions.md](./contracts/admin-actions.md) — the three admin server actions,
  their inputs, refusal conditions and audit obligations.
- [contracts/clerk-webhook.md](./contracts/clerk-webhook.md) — the webhook endpoint contract,
  verification, event handling and idempotency requirements.
- [quickstart.md](./quickstart.md) — the manual dashboard configuration that cannot be scripted,
  plus the runnable validation sequence for each acceptance scenario.
