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
4. **System of record only.** Role, tier and `is_active` are read from `users` via the RLS-scoped
   Supabase client on every request. If no row exists the guard performs the lazy upsert from
   `lib/auth/sync-user.ts` before resolving (FR-007, R-008). The Clerk session claim is a display
   mirror and is never an authorization input — see research R-004 for the three ways the earlier
   claim fast path failed. A row with `is_active = false` is refused.
5. **Per-request evaluation.** No caching across requests. A role change is visible on the very
   next request (FR-014), with no staleness window.
6. **`returnTo` is captured, not constructed.** On `unauthenticated` the guard returns the actual
   requested path, read from the `x-pathname` header that `proxy.ts` stamps with `Headers.set`
   (which overwrites any client-supplied value), and passed through `safeReturnTo` regardless — a
   request that somehow bypasses the proxy matcher must not be able to steer the redirect. Callers
   use `result.returnTo`; they do not re-derive the path themselves.

7. **`safeReturnTo` resolves rather than pattern-matches.** It lives in `lib/auth/return-to.ts`,
   free of `server-only` so it is directly testable. A prefix check is insufficient: WHATWG URL
   parsing treats `\` as a path separator and strips leading tabs and newlines, so `/\evil.com`
   and `/<TAB>/evil.com` both pass `startsWith('//')` and then resolve cross-origin. The check
   resolves the candidate against a sentinel origin and compares origins.

## Caller obligations

| Caller | Obligation |
|---|---|
| Segment layout | Call the guard first. **A layout guard is a backstop, not the control**: Next.js renders a layout and its page concurrently, and does not re-run a layout on client-side navigation between siblings under it. Every page in a guarded group must call the guard itself as well. On `unauthenticated`, `redirect('/auth/sign-in?return_to=…')`. On `insufficient_tier`, render the upgrade prompt (FR-015). On `not_admin`, call `notFound()` — an admin refusal must not disclose that the route exists (FR-015). On `unavailable`, render the service-unavailable state. |
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
- Unit: `safeReturnTo` rejects `//evil.com`, `/\evil.com`, `/\/evil.com`, and tab/newline variants.
- Contract: a user with `is_active = false` is refused, whatever their role.
- Unit: each failure mode returns its exact discriminant; no error escapes the function.
- Contract: a route handler with the guard removed fails its test — the test asserts refusal at the
  handler, not at the layout, so layout-only protection cannot pass.
