# Quickstart & Validation: Authentication, User Model & Role Gating

**Feature**: `specs/001-auth-user-model` | **Date**: 2026-08-28

How to bring this slice up from a clean checkout and prove each acceptance scenario. Several steps
are vendor dashboard configuration that cannot be scripted — they are called out as **manual**.

---

## Prerequisites

- Node.js ≥ 20.9.0
- A Clerk application (development instance is fine)
- A Supabase project
- The Supabase CLI, for local migrations

---

## 1. Environment

Copy `.env.example` to `.env.local` and fill it. `.env.local` is git-ignored and must stay that
way (Constitution, Technology Stack & Constraints).

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…
CLERK_SECRET_KEY=sk_test_…
CLERK_WEBHOOK_SIGNING_SECRET=whsec_…
ADMIN_CLERK_USER_ID=user_…            # filled in at step 4

NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
SUPABASE_SECRET_KEY=sb_secret_…        # server only; never NEXT_PUBLIC_
```

`lib/env.ts` validates these with Zod at boot, so a missing variable fails immediately with a named
error rather than surfacing later as a confusing runtime fault.

Note the key naming: Supabase's `anon` / `service_role` JWT keys are superseded by
`sb_publishable_…` / `sb_secret_…`. Both generations still work; the legacy pair is deprecated at
the end of 2026.

---

## 2. Clerk dashboard **(manual)**

1. **Sessions → Customize session token → Claims editor.** Add:
   ```json
   { "role": "{{user.public_metadata.role}}", "tier": "{{user.public_metadata.tier}}" }
   ```
   Keep custom claims small — roughly 1.2KB is available before the session cookie silently fails
   to set (R-004). Two short strings is well inside that.

2. **Integrations → Supabase → activate.** This reveals your Clerk domain
   (`<something>.clerk.accounts.dev`) and automatically adds the `role: "authenticated"` claim that
   Supabase requires. Copy the domain.

3. **Webhooks → add endpoint.** URL `https://<your-host>/api/webhooks/clerk`, events
   `user.created`, `user.updated`, `user.deleted`. Copy the signing secret into
   `CLERK_WEBHOOK_SIGNING_SECRET`. For local development, tunnel to `localhost:3000` and register
   the tunnel URL.

Do **not** create a JWT template named `supabase` — that approach was deprecated on 2025-04-01 and
is replaced by step 3 below (R-005).

---

## 3. Supabase **(manual + CLI)**

Manual: **Authentication → Third-Party Auth → add Clerk**, pasting the domain from step 2.

Then locally:

```bash
# supabase/config.toml already contains:
#   [auth.third_party.clerk]
#   enabled = true
#   domain = "<your>.clerk.accounts.dev"

supabase db push        # applies 0001_users.sql and 0002_role_changes.sql
```

Verify RLS is on before proceeding — a table without it is readable by anyone holding the
publishable key:

```sql
select relname, relrowsecurity from pg_class
where relname in ('users','role_changes');
-- both rows must show relrowsecurity = true
```

---

## 4. Designate the administrator

Sign up through the app's own `/auth/sign-up` with Mike's email, verify it, then copy that Clerk
user id into `ADMIN_CLERK_USER_ID` and restart. Admin is configuration, not a database value
(R-010) — there is deliberately no in-product path to grant it.

---

## 5. Run

```bash
npm install
npm run dev          # http://localhost:3000
```

Gates before any commit (Constitution, Development Workflow):

```bash
npm run lint
npx tsc --noEmit
npm run build
```

---

## Validation scenarios

Each maps to acceptance scenarios in [spec.md](./spec.md). Automated equivalents live in
`tests/e2e/auth-flows.spec.ts`; run them with `npm run test:e2e`.

### V-1 — Sign up, verify, sign in (US1)

1. Visit `/auth/sign-up`, register a new email. **Expect**: told to check inbox; a `users` row
   exists with `role='registered'`, `tier='free'`.
2. Click the verification link. **Expect**: signed in and returned to the site.
3. Sign out, sign back in. **Expect**: signed in.
4. Sign in with a wrong password. **Expect**: an error that does not reveal whether the email is
   registered (FR-004).
5. Request a password reset for an address that does **not** exist. **Expect**: the confirmation
   message is byte-identical to the one for a real address.
6. Reset the password on a real account while signed in on a second browser. **Expect**: the second
   session is terminated (FR-005).

### V-2 — Gate holds (US2)

Walk these as each principal. Use direct URL entry and a hard refresh, not navigation clicks.

| Principal | `/` | `/oak-calculator` | `/admin/users` |
|---|---|---|---|
| Signed out | 200 | redirect to sign-in, `return_to` preserved | 404 |
| Registered, free | 200 | upgrade prompt, no gated content | 404 |
| Founder (`cellar_master`) | 200 | 200 | 404 |
| Admin | 200 | 200 | 200 |

Then bypass the UI entirely — call the admin server action and the gated route handler directly
with a non-admin session. **Expect**: 404 and 403 respectively, with no write performed (FR-012,
SC-002). This is the check that distinguishes real enforcement from hidden navigation.

### V-3 — Founder grant (US3)

1. As admin, open `/admin/users`, search the V-1 account's email. **Expect**: found, showing
   `registered` / `free`.
2. Grant Founder with the default tier. **Expect**: row shows `founder` / `cellar_master` /
   `founder_grant`; one `role_changes` row with `from_role='registered'`, `to_role='founder'` and
   the admin's id.
3. In the other browser, refresh `/oak-calculator` **without signing out**. **Expect**: renders
   (FR-014, SC-003).
4. Revoke. **Expect**: `registered` / `free` / `none`; a second `role_changes` row; the other
   browser's next request shows the upgrade prompt.
5. Attempt to change the admin's own role from the list. **Expect**: refused (FR-020).

### V-4 — Webhook

1. Replay a `user.created` delivery from the Clerk dashboard. **Expect**: still exactly one row.
2. Send a request with a tampered signature. **Expect**: 400, nothing written.
3. Send `user.updated` whose payload includes a `role` field. **Expect**: email updates, stored role
   unchanged.

### V-5 — Fail closed

Point `NEXT_PUBLIC_SUPABASE_URL` at an unreachable host and request `/oak-calculator` as a Founder.
**Expect**: service-unavailable state, **not** the gated content and not a blank page (FR-016).
This scenario is the one most likely to regress silently, so it has an automated counterpart.
