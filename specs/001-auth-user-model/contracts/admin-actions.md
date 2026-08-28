# Contract: Admin server actions

**Module**: `app/admin/users/actions.ts` | **Feature**: `specs/001-auth-user-model`

Three mutations, all Server Actions. Every one begins with `await requireRole({ role: 'admin' })`
as its first statement (FR-012), reads current state from Postgres rather than from the session
claim (R-004), and writes a `role_changes` row in the same transaction as the `users` update
(FR-019).

## `listUsers`

```ts
listUsers(input: { query?: string; limit?: number; cursor?: string })
  : Promise<{ users: AdminUserRow[]; nextCursor: string | null }>
```

Returns email, role, tier, entitlement source, sign-up date and active flag (FR-017). `query` is a
case-insensitive match against email. Reads through the service-role client because an
administrator legitimately reads rows that are not their own, which RLS forbids.

## `grantFounder`

```ts
grantFounder(input: { clerkUserId: string; tier?: Tier; reason?: string })
  : Promise<{ ok: true } | { ok: false; error: 'not_found' | 'already_founder' | 'forbidden' }>
```

- `tier` defaults to `cellar_master` (FR-010).
- Sets `role = 'founder'`, `tier = input.tier ?? 'cellar_master'`,
  `entitlement_source = 'founder_grant'`.
- `tier` of `'free'` is rejected by validation — a Founder with no entitlement is meaningless and
  is barred by the table CHECK anyway.
- Writes the audit row including the prior values, unconditionally (see concurrency, below).

## `revokeFounder`

```ts
revokeFounder(input: { clerkUserId: string; reason?: string })
  : Promise<{ ok: true } | { ok: false; error: 'not_found' | 'not_founder' | 'forbidden' }>
```

Calls `recomputeEntitlement(userId)` rather than resetting literal values (FR-021, data-model). In
Phase 1 that resolves to `registered` / `free` / `none`; once subscriptions exist it resolves to
whatever the live subscription confers, with no change to this action.

## Universal rules

1. **Self-demotion is refused.** If `input.clerkUserId === env.ADMIN_CLERK_USER_ID`, every mutation
   returns `forbidden` before touching the database (FR-020). Enforced in the shared preamble, not
   per action, so a new action cannot forget it.
2. **Input is validated with Zod** before any database access. `clerkUserId` must match Clerk's id
   shape; `tier` must be a member of the enum; `reason` is capped at 500 characters.
3. **Audit is written unconditionally**, even when the new value equals the old one. This is what
   makes the concurrent-write edge case in the spec resolve to "later write wins, both recorded".
4. **Refusals are typed, never thrown.** A thrown error crossing the server-action boundary leaks
   stack structure to the client.
5. **`revalidatePath('/admin/users')`** after every successful mutation, so the list reflects the
   change without a manual refresh.
6. **Clerk metadata is updated in the same operation** so the affected user's session claim
   converges promptly rather than waiting a full refresh cycle (R-004).

## Test obligations

- Contract: each action called by a non-admin principal returns `forbidden` and performs no write.
- Contract: `grantFounder` on the admin's own id returns `forbidden`.
- Contract: a successful grant produces exactly one `users` update and exactly one `role_changes`
  row, with `from_*` matching the pre-state.
- Contract: `revokeFounder` on a non-Founder returns `not_founder` and writes nothing.
- Integration: grant → the target's next request to `/oak-calculator` renders; revoke → the next
  request shows the upgrade prompt.
