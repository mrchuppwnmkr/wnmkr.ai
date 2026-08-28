'use server'

import { revalidatePath } from 'next/cache'
import { clerkClient } from '@clerk/nextjs/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/require-role'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { serverEnv } from '@/lib/env'
import { recomputeEntitlement, TIERS, type Tier, type Role, type EntitlementSource } from '@/lib/auth/roles'

/**
 * Admin mutations. Contract: specs/001-auth-user-model/contracts/admin-actions.md
 *
 * Every action goes through adminPreamble() first. Putting the admin check, the self-demotion
 * refusal and validation in one shared place is deliberate: a future action cannot forget them.
 */

export type ActionError =
  | 'forbidden'
  | 'not_found'
  | 'already_founder'
  | 'not_founder'
  | 'invalid_input'
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: ActionError }

const clerkUserId = z.string().startsWith('user_').max(64)

async function adminPreamble(targetClerkUserId?: string): Promise<
  { ok: true; actorId: string } | { ok: false; error: ActionError }
> {
  const guard = await requireRole({ role: 'admin' })
  if (!guard.ok) return { ok: false, error: 'forbidden' }

  // Self-demotion refusal (FR-020). Checked before any database access, so a mutation cannot
  // partially apply before being rejected.
  if (targetClerkUserId && targetClerkUserId === serverEnv().ADMIN_CLERK_USER_ID) {
    return { ok: false, error: 'forbidden' }
  }
  return { ok: true, actorId: guard.principal.clerkUserId }
}

export type AdminUserRow = {
  id: string
  clerk_user_id: string
  email: string
  role: Role
  tier: Tier
  entitlement_source: EntitlementSource
  is_active: boolean
  created_at: string
}

export async function listUsers(input: {
  query?: string
  limit?: number
}): Promise<ActionResult<{ users: AdminUserRow[] }>> {
  const pre = await adminPreamble()
  if (!pre.ok) return { ok: false, error: pre.error }

  const parsed = z
    .object({ query: z.string().max(200).optional(), limit: z.number().int().min(1).max(100).optional() })
    .safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid_input' }

  // Service-role: an administrator legitimately reads rows that are not their own, which RLS
  // forbids by design.
  const supabase = createAdminSupabaseClient()
  let q = supabase
    .from('users')
    .select('id, clerk_user_id, email, role, tier, entitlement_source, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(parsed.data.limit ?? 50)

  if (parsed.data.query) q = q.ilike('email', `%${parsed.data.query}%`)

  const { data, error } = await q
  if (error) {
    console.error('[admin] listUsers failed', error.message)
    return { ok: false, error: 'not_found' }
  }
  return { ok: true, data: { users: (data ?? []) as AdminUserRow[] } }
}

export async function grantFounder(input: {
  clerkUserId: string
  tier?: Tier
  reason?: string
}): Promise<ActionResult> {
  const parsed = z
    .object({
      clerkUserId,
      // 'free' is rejected: a Founder with no entitlement is meaningless, and the table CHECK
      // would refuse it anyway.
      tier: z.enum(TIERS).refine((t) => t !== 'free', 'Founder tier cannot be free').optional(),
      reason: z.string().max(500).optional(),
    })
    .safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid_input' }

  const pre = await adminPreamble(parsed.data.clerkUserId)
  if (!pre.ok) return { ok: false, error: pre.error }

  const supabase = createAdminSupabaseClient()
  const { data: existing, error: readErr } = await supabase
    .from('users')
    .select('id, role, tier')
    .eq('clerk_user_id', parsed.data.clerkUserId)
    .maybeSingle()

  if (readErr) return { ok: false, error: 'not_found' }
  if (!existing) return { ok: false, error: 'not_found' }
  if (existing.role === 'founder') return { ok: false, error: 'already_founder' }

  const toTierValue: Tier = parsed.data.tier ?? 'cellar_master'

  const { error: updateErr } = await supabase
    .from('users')
    .update({ role: 'founder', tier: toTierValue, entitlement_source: 'founder_grant' })
    .eq('id', existing.id)
  if (updateErr) {
    console.error('[admin] grantFounder update failed', updateErr.message)
    return { ok: false, error: 'not_found' }
  }

  await writeAudit(existing.id, pre.actorId, existing.role, 'founder', existing.tier, toTierValue, parsed.data.reason)
  await syncClaims(parsed.data.clerkUserId, 'founder', toTierValue)
  revalidatePath('/admin/users')
  return { ok: true }
}

export async function revokeFounder(input: {
  clerkUserId: string
  reason?: string
}): Promise<ActionResult> {
  const parsed = z
    .object({ clerkUserId, reason: z.string().max(500).optional() })
    .safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid_input' }

  const pre = await adminPreamble(parsed.data.clerkUserId)
  if (!pre.ok) return { ok: false, error: pre.error }

  const supabase = createAdminSupabaseClient()
  const { data: existing } = await supabase
    .from('users')
    .select('id, role, tier')
    .eq('clerk_user_id', parsed.data.clerkUserId)
    .maybeSingle()

  if (!existing) return { ok: false, error: 'not_found' }
  if (existing.role !== 'founder') return { ok: false, error: 'not_founder' }

  // recomputeEntitlement(), not a literal reset — once subscriptions exist this resolves to
  // whatever the live subscription confers, with no change to this call site (FR-021).
  const next = recomputeEntitlement(parsed.data.clerkUserId)

  const { error: updateErr } = await supabase
    .from('users')
    .update({ role: next.role, tier: next.tier, entitlement_source: next.source })
    .eq('id', existing.id)
  if (updateErr) return { ok: false, error: 'not_found' }

  await writeAudit(existing.id, pre.actorId, existing.role, next.role, existing.tier, next.tier, parsed.data.reason)
  await syncClaims(parsed.data.clerkUserId, next.role, next.tier)
  revalidatePath('/admin/users')
  return { ok: true }
}

/**
 * Written unconditionally, even when the new value equals the old one. That is what makes two
 * concurrent admin writes resolve to "later write wins, both recorded" (data-model.md).
 */
async function writeAudit(
  userId: string,
  actorId: string,
  fromRole: Role,
  toRole: Role,
  fromTier: Tier,
  toTier: Tier,
  reason?: string,
) {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase.from('role_changes').insert({
    user_id: userId,
    changed_by_clerk_user_id: actorId,
    from_role: fromRole,
    to_role: toRole,
    from_tier: fromTier,
    to_tier: toTier,
    reason: reason ?? null,
  })
  if (error) console.error('[admin] audit write failed', error.message)
}

/**
 * Push role and tier into Clerk public metadata so the session claim converges promptly rather
 * than waiting a full token refresh (research R-004). Postgres remains the system of record.
 */
async function syncClaims(targetClerkUserId: string, role: Role, tier: Tier) {
  try {
    const client = await clerkClient()
    await client.users.updateUserMetadata(targetClerkUserId, {
      publicMetadata: { role, tier },
    })
  } catch (err) {
    console.error('[admin] claim sync failed; Postgres remains authoritative', err)
  }
}
