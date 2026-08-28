-- Feature: specs/001-auth-user-model
-- Append-only audit trail (FR-019). No UPDATE or DELETE path exists in application code.

create table public.role_changes (
  id                       uuid primary key default gen_random_uuid(),
  -- RESTRICT, not CASCADE: the audit trail outlives the user record. Deletion is not the user
  -- lifecycle path anyway — user.deleted sets users.is_active = false.
  user_id                  uuid             not null references public.users (id) on delete restrict,
  changed_by_clerk_user_id text             not null,
  from_role                user_role        not null,
  to_role                  user_role        not null,
  from_tier                entitlement_tier not null,
  to_tier                  entitlement_tier not null,
  reason                   text             check (reason is null or length(reason) <= 500),
  created_at               timestamptz      not null default now()
);

create index role_changes_user_created_idx
  on public.role_changes (user_id, created_at desc);

alter table public.role_changes enable row level security;

-- No policy for the `authenticated` role, on purpose. RLS enabled with no policy denies
-- everything, which is the correct default for an audit log (Constitution Principle III).
-- The admin UI reads this through the service-role client, which bypasses RLS by design.
