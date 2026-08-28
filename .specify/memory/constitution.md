<!--
Sync Impact Report (v1.1.0)
Version change: 1.0.0 → 1.1.0
Bump rationale: MINOR — Principle III's enforcement mechanism is materially revised. Research
R-001 established that Clerk deprecated `createRouteMatcher()` and now directs authorization to
the resource rather than to middleware. The principle (deny by default, server-enforced, never
client-only) is unchanged; the prescribed mechanism is now segment-layout guards plus independent
per-handler checks. No principle removed or redefined, so this is not a MAJOR bump.
Modified principles: III. Deny by Default (mechanism revised)
Added sections: none
Removed sections: none
Follow-up TODOs: none

--- Previous report ---
Version change: (none) → 1.0.0
Bump rationale: MAJOR — initial ratification of the project constitution; all placeholders
resolved from the Site Architecture v1.7 decisions.
Modified principles: none (initial adoption)
Added sections:
  - Core Principles I–V
  - Technology Stack & Constraints
  - Development Workflow & Quality Gates
  - Governance
Removed sections: none
Follow-up TODOs: none
-->

# wnmkr.ai Constitution

## Core Principles

### I. Spec-Driven Delivery (NON-NEGOTIABLE)

Every feature MUST originate as a spec under `specs/`, progress through a plan and a task
breakdown, and only then be implemented. Code that has no corresponding spec entry MUST NOT be
merged. When implementation reveals that the spec was wrong, the spec is amended first and the
change is noted in the feature's plan — the spec is never left trailing the code.

Rationale: this project is deliberately a spec-driven-development practice ground as well as a
product. The artifacts are a deliverable, not scaffolding to be discarded once the code works.

### II. Production-Lite, Not Prototype

Everything shipped MUST be deployable to real users on real infrastructure. No mock data layers,
no in-memory stores standing in for the database, no auth stubs. A feature is done when it works
against Supabase, Clerk, and Vercel as configured — not when it works locally against fixtures.
Scope may be cut; production-readiness may not.

Rationale: Phase 1 ships to paying Founders. A prototype that must be rebuilt to go live costs
more than building it correctly the first time.

### III. Deny by Default

Authorization MUST be enforced server-side, as close to the protected resource as possible. Every
protected route segment MUST carry a guard in its segment layout, and every route handler and
server action that reads or mutates privileged data MUST perform its own independent check — the
layout guard is never assumed to have run. Route-matcher lists in middleware MUST NOT be the
enforcement mechanism, because they fail open the moment a route is added that nobody remembered
to list. Any resource whose access level is not explicitly declared is inaccessible. Client-side
gating is presentation only and MUST NOT be the sole control. `localStorage` MAY be used for the anonymous
AI teaser counter, which is a courtesy limit and NOT a security boundary; anything that costs
money or exposes subscriber content MUST be verified against the server-side role.

Rationale: the paid tiers, the Founder comp path, and the admin panel are all one missing check
away from being free.

### IV. Domain Values Are Sourced, Never Invented

Winemaking constants — oak addition rates, toast codes, intensity bands, calculation formulas —
MUST trace to `claude/oak-calculator-reference.md` or another named source document. Neither code
nor AI responses may originate a numeric recommendation that has no cited origin. Where a value is
unknown, the product says so rather than estimating.

Rationale: users make real decisions about real wine on these numbers. A plausible-sounding wrong
addition rate ruins a vintage.

### V. Cost Ceilings Are Features

Every path that calls the Anthropic API MUST ship with its cost controls in the same change:
prompt caching, the tier's monthly and daily query caps, and context summarization after 10 turns.
A feature that can call the model without an enforced ceiling is incomplete and MUST NOT merge.

Rationale: a subscription product with uncapped inference cost has negative margin by default.

## Technology Stack & Constraints

The stack is resolved (Architecture Decision #7) and MUST NOT be substituted without a
constitution amendment:

| Layer | Technology |
|---|---|
| Frontend + API routes | Next.js (App Router) |
| Hosting + deploys | Vercel |
| Database | Supabase (Postgres) |
| Auth + subscription status | Clerk |
| Payments | Stripe |
| AI | Anthropic API — Claude Sonnet 5 with prompt caching |
| Service bookings | Calendly |

Additional constraints:

- TypeScript strict mode MUST be enabled; `any` requires an inline justification comment.
- Secrets MUST come from environment variables. No key, token, or connection string is ever
  committed, and `.env.local` MUST remain git-ignored.
- Supabase Row Level Security MUST be enabled on every table holding user data.
- Clerk is the identity system of record; Supabase rows reference the Clerk user id and MUST NOT
  duplicate credentials.
- The canonical role set is: `anonymous`, `registered`, `vintner`, `winemaker`, `cellar_master`,
  `founder`, `admin`. Adding or renaming a role is a MINOR amendment to this constitution.
- `main` serves the live GitHub Pages holding page at wnmkr.ai until the Vercel cutover is
  explicitly performed. Until then, application work lands on feature branches only.

## Development Workflow & Quality Gates

- Work happens on a branch off `main`, one branch per spec. `main` is never edited directly.
- Merges happen by pull request with the diff reviewed.
- Before any commit, `npm run lint`, `npx tsc --noEmit`, and `npm run build` MUST all pass.
- Every merged change MUST leave the repo in a state where `npm run build` succeeds from a clean
  checkout with only documented environment variables set.
- Each feature branch carries its spec artifacts (`spec.md`, `plan.md`, `tasks.md`) in the same
  commit history as the code they describe.
- Committed images MUST stay under ~500 KB, be stripped of EXIF, and use lowercase hyphenated
  filenames.

## Governance

This constitution supersedes ad-hoc practice. Where a task, plan, or prompt conflicts with it, the
constitution wins and the conflicting artifact is corrected.

Amendment procedure: propose the change in the pull request that requires it, state the version
bump and its rationale, and update this file in that same pull request. Amendments take effect on
merge.

Versioning policy follows semantic versioning:
- MAJOR — a principle is removed or redefined in a backward-incompatible way.
- MINOR — a principle or section is added, or existing guidance is materially expanded.
- PATCH — clarifications, wording, and non-semantic refinements.

Compliance review: every pull request MUST confirm that it satisfies Principles I–V, or state
explicitly which principle it deviates from and why. Unjustified complexity is grounds for
rejection.

**Version**: 1.1.0 | **Ratified**: 2026-08-28 | **Last Amended**: 2026-08-28
