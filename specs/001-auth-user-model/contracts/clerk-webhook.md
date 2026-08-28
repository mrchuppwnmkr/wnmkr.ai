# Contract: Clerk webhook endpoint

**Route**: `POST /api/webhooks/clerk` → `app/api/webhooks/clerk/route.ts`
**Feature**: `specs/001-auth-user-model`

Keeps the `users` table in step with Clerk identities. This is the primary provisioning path; the
lazy upsert in `requireRole()` is the safety net for its eventual-consistency window (R-008).

## Verification

Verified with `verifyWebhook()` from `@clerk/nextjs/webhooks`. Hand-rolled `svix` verification is
no longer the documented approach. The signing secret is `CLERK_WEBHOOK_SIGNING_SECRET`.

An unverifiable request returns **400** and performs no write. The endpoint must be publicly
reachable — since route protection is resource-level rather than a middleware matcher (R-001),
there is no blanket `/api` guard to exempt it from, but any future one must exclude this path.

## Events

| Event | Action |
|---|---|
| `user.created` | Upsert on `clerk_user_id` with `role = 'registered'`, `tier = 'free'`, `entitlement_source = 'none'`. No `role_changes` row — this is provisioning, not a role change. |
| `user.updated` | Update `email` only. **Never** touches `role`, `tier` or `entitlement_source` — Clerk is not the system of record for entitlement, and letting it write those would make user-editable profile data an authorization input. |
| `user.deleted` | Set `is_active = false`. The row is retained so `role_changes` foreign keys stay valid. |

Any other event type is acknowledged with **200** and ignored, so Clerk does not retry events we
do not handle.

## Client

Uses the **service-role** Supabase client (`lib/supabase/admin.ts`). This is the one place in the
codebase where it is correct: the write happens before any session for that user exists, so there
is no Clerk token to scope RLS with (R-007). The service-role key is never combined with the
`accessToken` callback, and never referenced from a `NEXT_PUBLIC_` variable.

## Idempotency and ordering

- All writes are upserts keyed on `clerk_user_id`. Redelivery is a no-op.
- Events may arrive out of order. `user.updated` for a `clerk_user_id` with no row inserts one
  rather than failing — the same upsert path as `user.created`.
- The handler returns 200 on success. Any 5xx causes Clerk to retry, which is safe given the
  upserts.

## Test obligations

- Contract: a request with an invalid signature returns 400 and writes nothing.
- Contract: `user.created` delivered twice produces exactly one row.
- Contract: `user.updated` carrying a `role` field in its payload does not change the stored role.
- Contract: `user.deleted` sets `is_active = false` and leaves `role_changes` rows intact.
- Contract: an unrecognised event type returns 200 and writes nothing.
