# Phase 1 Data Model: Authentication, User Model & Role Gating

**Feature**: `specs/001-auth-user-model` | **Date**: 2026-08-28

Two tables. Clerk owns credentials, sessions and email verification; Postgres owns role,
entitlement and audit history. Nothing about a password ever reaches this schema.

---

## Enums

### `user_role`

`registered` · `vintner` · `winemaker` · `cellar_master` · `founder` · `admin`

The spec's seventh role, `anonymous`, is deliberately **not** a stored value — it is the absence of
an authenticated identity (FR-008). Encoding it would create a row that could be granted access.

### `entitlement_tier`

`free` · `vintner` · `winemaker` · `cellar_master`

Ordered. The guard compares by ordinal position, so `minTier: 'vintner'` admits all three paid
tiers without enumerating them.

### `entitlement_source`

`none` · `subscription` · `founder_grant`

Required by FR-009 so that billing reconciliation can later distinguish a paying subscriber from a
comped Founder holding identical access. `subscription` is unreachable until the Stripe slice
lands; it exists now so that slice adds no migration to this table.

---

## Table: `users`

One row per Clerk identity (FR-007).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Internal surrogate key |
| `clerk_user_id` | `text` | UNIQUE, NOT NULL | **`text`, not `uuid`** — Clerk ids are `user_2ab…` (R-006) |
| `email` | `text` | NOT NULL | Mirrored from Clerk for the admin search in FR-017 |
| `role` | `user_role` | NOT NULL, default `registered` | System of record for role |
| `tier` | `entitlement_tier` | NOT NULL, default `free` | Stored separately so a Founder grant can set tier independently of role (FR-010) |
| `entitlement_source` | `entitlement_source` | NOT NULL, default `none` | FR-009 |
| `is_active` | `boolean` | NOT NULL, default `true` | Set false on `user.deleted` rather than deleting the row, so audit history is not orphaned |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Sign-up date shown in the admin list |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Maintained by trigger |

**Indexes**: unique on `clerk_user_id`; btree on `lower(email)` for the admin search; btree on
`role` filtered to `role <> 'registered'` for the admin list's default view.

### Validation rules

- `email` must be non-empty. It is never used for authentication decisions — only for display and
  search — so it is not treated as a unique key; Clerk owns email uniqueness.
- `role = 'admin'` in this table is **display only**. The authoritative admin check is
  `clerk_user_id = ADMIN_CLERK_USER_ID` (R-010, FR-011). Code must never grant admin access from
  this column alone.
- `role = 'founder'` requires `entitlement_source = 'founder_grant'` and `tier <> 'free'`. Enforced
  by a table CHECK constraint so a partial write cannot produce a Founder with no entitlement.
- `role = 'registered'` requires `tier = 'free'` and `entitlement_source = 'none'`. Also a CHECK.

### Derived tier

When `entitlement_source = 'subscription'`, tier follows the subscription and role mirrors it
(`vintner` → `vintner`). When `entitlement_source = 'founder_grant'`, role is `founder` and tier is
whatever the administrator set, defaulting to `cellar_master` (FR-010). The guard always reads
`tier`; it never infers tier from role. This is what makes FR-021 a one-line revocation.

---

## Table: `role_changes`

Append-only audit trail (FR-019). No UPDATE or DELETE path exists in application code.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `users.id` ON DELETE RESTRICT | RESTRICT, not CASCADE — audit survives (deactivation, not deletion, is the user path) |
| `changed_by_clerk_user_id` | `text` | NOT NULL | The acting administrator |
| `from_role` | `user_role` | NOT NULL | |
| `to_role` | `user_role` | NOT NULL | |
| `from_tier` | `entitlement_tier` | NOT NULL | |
| `to_tier` | `entitlement_tier` | NOT NULL | |
| `reason` | `text` | NULL | Optional administrator note |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**Index**: btree on `(user_id, created_at desc)` — the per-user history view.

**Concurrency**: the spec's edge case of two simultaneous admin writes resolves as last-write-wins
on `users` with **both** attempts recorded in `role_changes`. The mutation therefore writes the
audit row unconditionally, not only when the value changed.

---

## Row Level Security

RLS is enabled on both tables (Constitution, Technology Stack & Constraints). Clerk ids arrive as
`auth.jwt()->>'sub'`, wrapped in `(select …)` so Postgres evaluates once per statement rather than
once per row (R-006).

```sql
alter table public.users enable row level security;

create policy "users read own row"
on public.users for select to authenticated
using ((select auth.jwt()->>'sub') = clerk_user_id);
```

`role_changes` has **no** policy for the `authenticated` role at all — an unpolicied table with RLS
enabled denies everything, which is the correct default for an audit log (Principle III). The admin
UI reads it through the service-role client, which bypasses RLS by design.

Deliberately absent: any policy allowing a user to UPDATE their own `role` or `tier`. Users have
read access to their own row and nothing more. All writes go through the webhook handler or the
admin server actions, both of which use the service-role client.

---

## State transitions

```
                    ┌─────────────────────────────────────────┐
  Clerk             │                                         │
  user.created  →   │  registered / free / none               │
                    │                                         │
                    └───────────┬─────────────────────┬───────┘
                                │                     │
              admin grants      │                     │  admin revokes
              Founder           ▼                     │
                    ┌─────────────────────────────────┴───────┐
                    │  founder / <chosen tier> / founder_grant │
                    └─────────────────────────────────────────┘

  Clerk user.deleted  →  is_active = false   (role and tier retained for audit)
```

Every transition writes a `role_changes` row. The `subscription` source and the three paid roles
are reachable only from the Stripe slice; they are modeled and gated now so that slice changes no
schema here.

**Invariant on revocation (FR-021)**: revoking Founder sets `role = 'registered'`, `tier = 'free'`,
`entitlement_source = 'none'` — because in Phase 1 no subscription can exist. When the Stripe slice
lands, revocation instead recomputes from the live subscription. The revocation function is written
now as `recomputeEntitlement(userId)` rather than as a literal reset, so that change is contained.

---

## Requirements traceability

| Requirement | Where satisfied |
|---|---|
| FR-007 one record per identity | `users.clerk_user_id` UNIQUE; webhook + lazy upsert both idempotent |
| FR-008 exact role set | `user_role` enum; `anonymous` intentionally unstored |
| FR-009 entitlement source | `users.entitlement_source` |
| FR-010 Founder default top tier | CHECK constraint + `cellar_master` default in the grant action |
| FR-011 admin by configuration | `ADMIN_CLERK_USER_ID`; `role='admin'` is display only |
| FR-013 deny undeclared | RLS enabled with no permissive default; `role_changes` unpolicied |
| FR-019 audit retained | `role_changes` append-only, FK ON DELETE RESTRICT |
| FR-021 revocation | `recomputeEntitlement()` |
