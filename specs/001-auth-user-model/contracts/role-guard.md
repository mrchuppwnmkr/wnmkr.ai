# Contract: `requireRole()` — the single authorization guard

**Module**: `lib/auth/require-role.ts` | **Feature**: `specs/001-auth-user-model`

One guard serves segment layouts, route handlers and server actions. Having exactly one is the
point: a second implementation is a second place for the rules to drift.

## Signature

```ts
type Role = 'registered' | 'vintner' | 'winemaker' | 'cellar_master' | 'founder' | 'admin'
type Tier = 'free' | 'vintner' | 'winemaker' | 'cellar_master'

type Requirement =
  | { authenticated: true }        // any signed-in user
  | { minTier: Tier }              // this tier or higher
  | { role: 'admin' }              // the configured administrator only

type Principal = {
  clerkUserId: string
  email: string
  role: Role
  tier: Tier
  isAdmin: boolean
}

type GuardResult =
  | { ok: true; principal: Principal }
  | { ok: false; reason: 'unauthenticated'; returnTo: string }
  | { ok: false; reason: 'insufficient_tier'; required: Tier; actual: Tier }
  | { ok: false; reason: 'not_admin' }
  | { ok: false; reason: 'unavailable' }

async function requireRole(req: Requirement): Promise<GuardResult>
```

## Behavioural contract

1. **No permissive default.** The result union has no branch that returns `ok: true` without an
   explicit requirement having been met. An unrecognised role resolves to `tier: 'free'` rather
   than throwing or passing (FR-013).
2. **Fails closed.** Any error reaching the guard — Clerk unreachable, Supabase unreachable,
   malformed claim — returns `{ ok: false, reason: 'unavailable' }`. It never throws past its own
   boundary and never returns `ok: true` on an error path (FR-016).
3. **Admin is configuration, not data.** `isAdmin` is `clerkUserId === env.ADMIN_CLERK_USER_ID`.
   The database `role` column is never consulted for this (FR-011, R-010).
4. **Fast path, correct fallback.** Role and tier are read from `sessionClaims`. If either claim is
   absent, the guard reads `users` via the RLS-scoped Supabase client, and if no row exists it
   performs the lazy upsert from `lib/auth/sync-user.ts` before resolving (FR-007, R-008).
5. **Per-request evaluation.** No caching across requests. A role change is visible on the next
   request (FR-014), bounded by session-token refresh as documented in R-004.
6. **`returnTo` is captured, not constructed.** On `unauthenticated` the guard returns the current
   pathname and search string so the caller can round-trip the user back after sign-in (FR-006).
   It is validated as a same-origin relative path before use — never an absolute URL.

## Caller obligations

| Caller | Obligation |
|---|---|
| Segment layout | Call the guard first, before rendering any child. On `unauthenticated`, `redirect('/auth/sign-in?return_to=…')`. On `insufficient_tier`, render the upgrade prompt (FR-015). On `not_admin`, call `notFound()` — an admin refusal must not disclose that the route exists (FR-015). On `unavailable`, render the service-unavailable state. |
| Route handler | Call the guard **independently**, never assuming a layout ran. Map to HTTP: `unauthenticated` → 401, `insufficient_tier` → 403 with an upgrade payload, `not_admin` → **404**, `unavailable` → 503. |
| Server action | Call the guard as the **first statement**, before reading arguments. Return a typed refusal; never throw a raw error to the client, which leaks structure. |
| Client component | May use the principal for presentation only. Hiding a control is never the control (Principle III). |

## Explicit non-goals

- The guard does not check the anonymous AI-consultant teaser count. That is a client-side
  courtesy limit, out of scope for this slice, and not an entitlement.
- The guard does not read Stripe. Entitlement comes from the `users` row; the Stripe slice writes
  that row rather than being consulted at request time.

## Test obligations

- Unit: tier ordering admits higher tiers and refuses lower ones, for every pair.
- Unit: unrecognised role string resolves to `free`, not to a pass.
- Unit: each failure mode returns its exact discriminant; no error escapes the function.
- Contract: a route handler with the guard removed fails its test — the test asserts refusal at the
  handler, not at the layout, so layout-only protection cannot pass.
