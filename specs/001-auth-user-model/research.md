# Phase 0 Research: Authentication, User Model & Role Gating

**Feature**: `specs/001-auth-user-model` | **Date**: 2026-08-28

All findings verified against vendor documentation on 2026-08-28. This project's stack was fixed
by Architecture Decision #7, so research here is not "which vendor" but "what is the correct
current shape of the integration" — several of these APIs changed in the last twelve months and
the obsolete patterns are still what most examples on the web show.

**Versions current on 2026-08-28**: `next` 16.3.3 · `@clerk/nextjs` 7.8.2 (Core 3) ·
`@supabase/supabase-js` 2.112.4 · `react` 19.2.8

---

## R-001: Where route protection is enforced

**Decision**: Enforce authorization at the resource, not in middleware. `proxy.ts` runs bare
`clerkMiddleware()` to establish the auth context only. Every protected page segment gets a
`layout.tsx` that calls a shared `requireRole()` guard, and every Server Action and Route Handler
calls the same guard independently.

**Rationale**: Clerk's current `clerkMiddleware()` reference deprecates `createRouteMatcher()` and
states plainly that middleware is not the right place to protect routes — protection belongs "as
close to the resource as possible, in the code that reads or mutates the data." This is also
strictly safer than the middleware-matcher approach, which fails open whenever a new route is added
that nobody remembered to add to the matcher list. Resource-level guards fail closed by
construction, which is what Constitution Principle III requires.

**Consequence for the constitution**: Principle III currently prescribes middleware as one of the
two enforcement points. It needs a MINOR amendment to describe segment-layout guards instead. The
principle itself — deny by default, enforced server-side, never client-only — is unchanged.

**Alternatives considered**:
- *`createRouteMatcher()` in middleware*: still functional but logs a runtime deprecation warning,
  and carries the fail-open-on-new-route hazard. Rejected.
- *Guard in each `page.tsx`*: correct but repeated on every page; a forgotten page is an open door.
  Segment layouts cover a whole subtree, so `/oak-calculator` and everything under it inherit one
  guard. Chosen instead.

**Source**: https://clerk.com/docs/reference/nextjs/clerk-middleware

---

## R-002: `proxy.ts` vs `middleware.ts`

**Decision**: The file is `proxy.ts` at the project root.

**Rationale**: Next.js 16 renamed the `middleware` convention to `proxy`. We are on 16.3.3. Contents
are otherwise identical to the old `middleware.ts`. The matcher must include `/__clerk/(.*)` — a
newer requirement than most examples show.

**Source**: https://nextjs.org/docs/messages/middleware-to-proxy ·
https://clerk.com/docs/quickstarts/nextjs

---

## R-003: Reading auth state server-side

**Decision**: `const { isAuthenticated, userId, sessionClaims } = await auth()` from
`@clerk/nextjs/server`. Always awaited. Use `isAuthenticated` rather than null-checking `userId`.
Reserve `currentUser()` for the rare case where full profile fields are needed, since it hits
Clerk's Backend API and is rate-limited.

**Rationale**: `auth()` has been async since Core 2 and `isAuthenticated` is the current documented
idiom. The same call works identically in Server Components, Route Handlers, and Server Actions,
which lets one `requireRole()` helper serve all three.

**Source**: https://clerk.com/docs/reference/nextjs/app-router/auth

---

## R-004: Where the role lives at request time

**Decision**: The role is stored in Supabase as the system of record and mirrored into the Clerk
session token as a custom claim, via Dashboard → Sessions → Customize session token. Read it as
`sessionClaims.role`, typed through a global `CustomJwtSessionClaims` interface. On any request
where the claim is absent or stale, fall back to a Supabase read.

**Rationale**: A claim read is free; a database round-trip on every gated page request is not, and
SC-007 caps gate cost at 100ms median. Storing the authoritative value in Postgres keeps the audit
trail and the admin UI coherent.

**Constraint discovered**: the session token is a cookie, browsers cap cookies at 4KB, and Clerk's
own default claims consume most of it — roughly **1.2KB is available for custom claims**. Exceeding
it makes the cookie silently fail to set, which breaks the app in a way that looks like a session
bug. We put one short string (`role`) and one short string (`tier`) in the token and nothing else.

**Staleness handling**: FR-014 requires a role change to take effect on the next request without
sign-out. Clerk refreshes the session token roughly every 60 seconds, so a claim-only read could
serve a stale role for up to a minute. Therefore: `requireRole()` reads the claim for the fast path,
but any admin-initiated role change calls Clerk's backend to update the user's metadata immediately,
and the admin mutation path itself always reads from Supabase rather than the claim. Documented as
a known bounded staleness of <60s for tier changes, 0s for admin operations.

**Naming note**: "JWT Templates" and "customize session token" are now two different features. JWT
Templates are not deprecated but are for minting separate tokens for third-party services; the docs
explicitly steer this use case to custom session claims.

**Source**: https://clerk.com/docs/guides/sessions/customize-session-tokens

---

## R-005: Clerk → Supabase connection

**Decision**: Use Supabase **Third-Party Auth** with Clerk. Do not create a Supabase JWT template
in Clerk.

**Rationale**: The Clerk JWT-template approach to Supabase was **deprecated on 2025-04-01**. It
required pasting the Supabase JWT signing secret into Clerk — secret sharing across vendors — and
minting a second token per request. Third-Party Auth has Supabase validate Clerk's own session token
against Clerk's public JWKS instead. No shared secret, no extra token.

Setup is: activate the Supabase integration in the Clerk dashboard (which automatically adds the
required `role: "authenticated"` claim to the session token), then register the Clerk domain under
Supabase → Authentication → Third-Party Auth, and add the same domain to `supabase/config.toml`
under `[auth.third_party.clerk]` for local development.

**Alternatives considered**: the legacy JWT template — rejected, deprecated and requires secret
sharing. Supabase Auth instead of Clerk — rejected, the stack is fixed by Decision #7.

**Source**: https://clerk.com/docs/guides/development/integrations/databases/supabase ·
https://supabase.com/docs/guides/auth/third-party/clerk ·
https://clerk.com/changelog/2025-03-31-supabase-integration

---

## R-006: RLS policy shape

**Decision**: Clerk user ids are stored as `text`, not `uuid`, and policies read
`(select auth.jwt()->>'sub')`.

**Rationale**: Clerk ids look like `user_2abc...` and are not UUIDs, so a `uuid` column type fails
outright. Wrapping the claim read in `(select ...)` is deliberate and load-bearing: it lets Postgres
evaluate the claim once per statement instead of once per row.

The `requesting_user_id()` helper that appears throughout older tutorials was a convention from the
JWT-template era — users defined it themselves. It appears nowhere in current documentation and we
do not use it.

**Source**: https://supabase.com/docs/guides/auth/third-party/clerk

---

## R-007: Supabase client construction

**Decision**: `@supabase/supabase-js` with the `accessToken` callback option. Do **not** add
`@supabase/ssr`.

```ts
createClient(url, publishableKey, {
  async accessToken() { return (await auth()).getToken() },
})
```

**Rationale**: `@supabase/ssr` exists to persist and refresh Supabase Auth's own `sb-*` cookies.
With Clerk as the identity provider there is no Supabase session to persist — Clerk owns the cookie
and Supabase receives a bearer token. The `accessToken` callback fires per request, so one exported
factory is safe to call from Server Components, Server Actions, and Route Handlers alike.

The service-role key is used in exactly one place — the Clerk webhook handler, which must insert a
user row before any session for that user exists. It bypasses RLS entirely, so it never appears in
a client component, never in a `NEXT_PUBLIC_` variable, and is never combined with `accessToken`
(the RLS bypass would silently void the per-user isolation).

**Confidence**: the "don't use `@supabase/ssr`" conclusion is inferred rather than stated outright —
neither vendor's Clerk guide uses it, and its documented purpose does not apply here. Flagged so a
future reader knows it was reasoned, not quoted.

**Source**: https://supabase.com/docs/guides/auth/server-side/nextjs ·
https://supabase.com/docs/guides/getting-started/api-keys

---

## R-008: Provisioning the user row

**Decision**: Clerk webhooks are the primary path — `user.created`, `user.updated`, `user.deleted`
to `app/api/webhooks/clerk/route.ts`, verified with `verifyWebhook()` from `@clerk/nextjs/webhooks`.
A lazy upsert in `requireRole()` is the safety net for the case where a webhook was missed.

**Rationale**: FR-007 requires exactly one application record per identity, existing no later than
the first authenticated request. Webhooks alone have an eventual-consistency window in which a user
can complete sign-up and hit a page before the webhook lands; the lazy upsert closes it and also
covers the spec's edge case of an identity with no application record. Both paths are idempotent
upserts on `clerk_user_id`.

**Changed since training-era examples**: hand-rolled `svix` verification is no longer the documented
approach — `verifyWebhook()` wraps it. The signing secret variable is `CLERK_WEBHOOK_SIGNING_SECRET`
(older docs said `WEBHOOK_SECRET` or `SIGNING_SECRET`). Note also that Clerk's guidance is to store
only supplementary app data keyed by Clerk user id rather than mirroring the whole profile — we
store email for the admin search UI and otherwise hold only role, tier, and status.

**Source**: https://clerk.com/docs/guides/development/webhooks/syncing

---

## R-009: Auth UI components

**Decision**: Use Clerk's hosted `<SignIn />` and `<SignUp />` components on catch-all routes at
`/auth/sign-in/[[...sign-in]]` and `/auth/sign-up/[[...sign-up]]`. Use `<Show when="signed-in">` /
`<Show when="signed-out">` for conditional chrome. `<ClerkProvider>` goes **inside** `<body>`.

**Rationale**: Core 3 removed `<SignedIn>`, `<SignedOut>`, and `<Protect>` in favour of `<Show>`, and
moved the provider inside `<body>`. Clerk Elements — the custom-UI path — is deprecated in favour of
redesigned `useSignIn`/`useSignUp` hooks, so for Phase 1 the hosted components are both the
supported and the cheapest route. Email verification, password strength, breached-password rejection
(FR-002), enumeration-safe responses (FR-004), and session revocation on password change (FR-005)
are all built in, which satisfies those requirements without custom code.

**Source**: https://clerk.com/docs/guides/development/upgrading/upgrade-guides/core-3

---

## R-010: Designating the administrator

**Decision**: `ADMIN_CLERK_USER_ID` environment variable, compared server-side. The database `role`
column may also hold `admin` for display, but the environment variable is authoritative.

**Rationale**: FR-011 requires the admin be designated by configuration rather than by a value any
user can set, and FR-020 requires an admin cannot remove their own admin role. Sourcing the answer
from an environment variable satisfies both structurally: there is no in-product write path that can
grant it, and the self-demotion check becomes a comparison the mutation code cannot bypass.

**Alternatives considered**: an `is_admin` boolean in Postgres — rejected, it makes admin a value
reachable by any code path with write access to that table, including a future bug in the Founder
grant mutation.

---

## Open items carried into implementation

| Item | Disposition |
|---|---|
| Clerk dashboard configuration (session claim, Supabase integration) is manual | Documented in `quickstart.md`; cannot be scripted |
| Session-claim staleness up to ~60s for tier changes | Accepted and documented in R-004; admin paths read from Postgres |
| TypeScript 7 is current on npm | Let `create-next-app` pin the toolchain rather than forcing a version |
