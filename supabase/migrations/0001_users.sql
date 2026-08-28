-- Feature: specs/001-auth-user-model
-- One row per Clerk identity. Clerk owns credentials, sessions and email verification;
-- this table owns role and entitlement.

create type user_role as enum (
  'registered', 'vintner', 'winemaker', 'cellar_master', 'founder', 'admin'
);

-- 'anonymous' is intentionally absent: it is the absence of an identity (FR-008), not a value.
-- Encoding it would create a row that could be granted access.

create type entitlement_tier as enum ('free', 'vintner', 'winemaker', 'cellar_master');

create type entitlement_source as enum ('none', 'subscription', 'founder_grant');

create table public.users (
  id                 uuid primary key default gen_random_uuid(),
  -- text, not uuid: Clerk ids look like user_2ab... and are not UUIDs.
  clerk_user_id      text               not null unique,
  -- Nullable on purpose. Clerk identities can exist without an email (phone sign-up, or an
  -- OAuth provider that returns none). A NOT NULL constraint here turns that into a permanent
  -- lockout, because provisioning fails and the guard then fails closed on every request.
  email              text,
  role               user_role          not null default 'registered',
  tier               entitlement_tier   not null default 'free',
  entitlement_source entitlement_source not null default 'none',
  is_active          boolean            not null default true,
  created_at         timestamptz        not null default now(),
  updated_at         timestamptz        not null default now(),

  -- A Founder with no entitlement is meaningless; a partial write must not be able to produce one.
  constraint founder_has_entitlement check (
    role <> 'founder'
    or (entitlement_source = 'founder_grant' and tier <> 'free')
  ),
  -- A plain registered user must not carry a paid tier.
  constraint registered_is_free check (
    role <> 'registered'
    or (tier = 'free' and entitlement_source = 'none')
  )
);

create index users_email_lower_idx on public.users (lower(email));
create index users_privileged_idx  on public.users (role) where role <> 'registered';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

alter table public.users enable row level security;

-- Clerk ids arrive as auth.jwt()->>'sub'. The (select ...) wrapper is load-bearing: it lets
-- Postgres evaluate the claim once per statement instead of once per row.
create policy "users read own row"
on public.users for select
to authenticated
using ((select auth.jwt() ->> 'sub') = clerk_user_id);

-- Deliberately absent: any policy letting a user UPDATE their own role or tier. All writes go
-- through the webhook handler or the admin server actions, both service-role.
