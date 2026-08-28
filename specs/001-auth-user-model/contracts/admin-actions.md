# Contract: Admin server actions

**Module**: `app/admin/users/actions.ts` | **Feature**: `specs/001-auth-user-model`

Three actions, all Server Actions. Server actions in a `'use server'` file are publicly invocable —
being rendered inside `/admin` restricts nothing — so every one calls
`await requireRole({ role: 'admin' })` as its **first statement**, before input is even parsed
(FR-012). Reads come from Postgres, never from a session claim (R-004). The `users` update and the
`role_changes` insert happen inside one Postgres function, `set_user_entitlement`, so they land
together or not at all (FR-019).

## `listUsers`

```ts
listUsers(input: { query?: string; limit?: number; cursor?: string })
  : Promise<ActionResult<{ users: AdminUserRow[]; nextCursor: string | null }>>
```

Returns email, role, tier, entitlement source, sign-up date and active flag (FR-017). `query` is a
case-insensitive match against email, with `%` and `_` escaped so a literal search stays literal.
`cursor` is the `created_at` of the last row of the previous page; one extra row is fetched to
decide `nextCursor` without a second query. Reads through the service-role client because an
administrator legitimately reads rows that are not their own, which RLS forbids.

A database failure returns `unavailable`, never `not_found` — "no users match" and "the directory
is down" must not look the same to the administrator.

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
3. **Audit is written unconditionally**, even when the new value equals the old one — inside
   `set_user_entitlement`, so it cannot be lost while the `users` update succeeds.
4. **Optimistic concurrency.** Each mutation passes the role it just read as `p_expected_role`. If
   another administrator changed the row in between, the function returns `stale` and the action
   returns `{ ok: false, error: 'stale' }` rather than clobbering. This is what makes the newest
   `role_changes` row actually describe the state that stuck.
5. **Refusals are typed, never thrown.** A thrown error crossing the server-action boundary leaks
   stack structure to the client.
6. **`revalidatePath('/admin/users')`** after every successful mutation, so the list reflects the
   change without a manual refresh.
7. **Clerk metadata is mirrored after the transaction commits.** It is a convenience for
   debugging in the Clerk dashboard, not an access control — the guard reads Postgres — so its
   failure is logged and does not fail an operation that has already committed.

## Test obligations

- Contract: each action called by a non-admin principal returns `forbidden` and performs no write.
- Contract: `grantFounder` on the admin's own id returns `forbidden`.
- Contract: a successful grant produces exactly one `users` update and exactly one `role_changes`
  row, with `from_*` matching the pre-state.
- Contract: an unauthenticated caller gets `forbidden`, not `invalid_input` — authorization runs
  before validation, so the action is not an input-format oracle.
- Contract: a concurrent change between read and write returns `stale` and leaves the row alone.
- Contract: `revokeFounder` on a non-Founder returns `not_founder` and writes nothing.
- Integration: grant → the target's next request to `/oak-calculator` renders; revoke → the next
  request shows the upgrade prompt.
