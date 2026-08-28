-- Feature: specs/001-auth-user-model
--
-- Transactional entitlement change. The users UPDATE and the role_changes INSERT must land
-- together or not at all (FR-019, SC-005): doing them as two PostgREST calls left a window in
-- which a grant could take effect with no audit row, and the caller could not tell.
--
-- Also carries an optimistic-concurrency guard. `expected_role` is the role the caller read a
-- moment ago; if another administrator changed it in between, this returns 'stale' rather than
-- clobbering. That makes the audit log's newest row actually describe the state that stuck.

create type entitlement_change_result as enum ('ok', 'not_found', 'stale');

create or replace function public.set_user_entitlement(
  p_clerk_user_id  text,
  p_expected_role  user_role,
  p_to_role        user_role,
  p_to_tier        entitlement_tier,
  p_to_source      entitlement_source,
  p_actor          text,
  p_reason         text default null
)
returns entitlement_change_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   public.users%rowtype;
begin
  select * into v_user
  from public.users
  where clerk_user_id = p_clerk_user_id
  for update;

  if not found then
    return 'not_found';
  end if;

  if v_user.role <> p_expected_role then
    return 'stale';
  end if;

  update public.users
     set role = p_to_role,
         tier = p_to_tier,
         entitlement_source = p_to_source
   where id = v_user.id;

  -- Written unconditionally, even when the new values equal the old ones, so a no-op change is
  -- still attributable (data-model.md).
  insert into public.role_changes (
    user_id, changed_by_clerk_user_id, from_role, to_role, from_tier, to_tier, reason
  ) values (
    v_user.id, p_actor, v_user.role, p_to_role, v_user.tier, p_to_tier, p_reason
  );

  return 'ok';
end;
$$;

-- Callable only by the service role. The admin actions reach it through the service-role client,
-- and every one of them is behind requireRole({ role: 'admin' }) first.
revoke execute on function public.set_user_entitlement(
  text, user_role, user_role, entitlement_tier, entitlement_source, text, text
) from public, anon, authenticated;
