# Session notes

## 2026-08-28 — Spec Kit init + Phase 1 auth slice

**Branch:** `phase1-auth` · 5 commits · **not pushed to origin yet**
**Spec:** `specs/001-auth-user-model/` · **Constitution:** v1.1.0

Initialized Spec Kit and ran the full loop — constitution → specify → plan → tasks → implement →
review — for authentication, the user/role model, and role gating.

### Pick up here tomorrow

1. `npm install` (lockfile is committed, `node_modules` was never written to this working copy)
2. Clerk + Supabase dashboard setup — `specs/001-auth-user-model/quickstart.md`, steps 1–4
3. `npm run dev`, then walk quickstart scenario **V-2**: hit `/oak-calculator` and `/admin/users`
   as each kind of user, by typing URLs directly and hard-refreshing
4. Then: contract + E2E tests (T021–T023, T030–T032, T039, T040), which need live credentials
5. `git push -u origin phase1-auth` when you're ready to open the PR

### Decisions worth remembering

- **Authorization is at the resource, not in middleware.** Clerk deprecated `createRouteMatcher()`.
  A matcher list fails open the moment someone adds a route and forgets to list it. `proxy.ts`
  establishes the auth context and nothing else. This overturned Principle III of the constitution,
  which was amended to v1.1.0 before the plan's gate was evaluated.
- **Clerk↔Supabase is Third-Party Auth**, not the JWT template — that was deprecated 2025-04-01 and
  required sharing the Supabase signing secret with Clerk.
- **Entitlement is read from Postgres every request.** The session claim is a display mirror only.
  The first implementation trusted the claim; review found that a revoke whose Clerk metadata write
  failed would leave the person permanently entitled while `/admin/users` showed them revoked.
- **Admin is `ADMIN_CLERK_USER_ID`, not a database value.** No in-product path grants it, and the
  self-demotion refusal can't be bypassed.
- **`main` still serves the GitHub Pages holding page.** `index.html` and `CNAME` are deliberately
  untouched. `docs/vercel-cutover.md` has the switch-over steps.

### Review outcome

An adversarial pass found 12 issues; 7 were real and are fixed on this branch (open redirect,
non-transactional audit write, auth-after-validation, email NOT NULL lockout, webhook returning 200
on write failure, `is_active` bypass, and the session-claim problem above). Full list at the bottom
of `specs/001-auth-user-model/tasks.md`.

The absence of contract tests is why those survived to review. Writing them is the highest-value
next task, not the leftover chore it looks like.

### Verified

`eslint`, `tsc --noEmit`, `next build`, 9 unit tests — all pass.
