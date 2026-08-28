'use server'

import { revalidatePath } from 'next/cache'
import { clerkClient } from '@clerk/nextjs/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/require-role'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { serverEnv } from '@/lib/env'
import {
  recomputeEntitlement,
  TIERS,
  type Tier,
  type Role,
  type EntitlementSource,
} from '@/lib/auth/roles'

/**
 * Admin mutations. Contract: specs/001-auth-user-model/contracts/admin-actions.md
 *
 * Server actions in a 'use server' file are publicly invocable — being rendered inside /admin
 * restricts nothing. So adminPreamble() runs FIRST in every action, before input is even parsed,
 * and carries the admin check plus the self-demotion refusal. One shared place means a future
 * action cannot forget them.
 */

export type ActionError =
  | 'forbidden'
  | 'not_found'
  | 'already_founder'
  | 'not_founder'
  | 'invalid_input'
  | 'stale'
  | 'unavailable'

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: ActionError }

const clerkUserIdSchema = z.string().startsWith('user_').max(64)

async function adminPreamble(): Promise<
  { ok: true; actorId: string } | { ok: false; error: ActionError }
> {
  const guard = await requireRole({ role: 'admin' })
  if (!guard.ok) return { ok: false, error: 'forbidden' }
  return { ok: true, actorId: guard.principal.clerkUserId }
}

/** Self-demotion refusal (FR-020), checked before any database access. */
function refusesSelf(targetClerkUserId: string): boolean {
  return targetClerkUserId === serverEnv().ADMIN_CLERK_USER_ID
}

export type AdminUserRow = {
  id: string
  clerk_user_id: string
  email: string | null
  role: Role
  tier: Tier
  entitlement_source: EntitlementSource
  is_active: boolean
  created_at: string
}

export async function listUsers(input: {
  query?: string
  limit?: number
  cursor?: string
}): Promise<ActionResult<{ users: AdminUserRow[]; nextCursor: string | null }>> {
  const pre = await adminPreamble()
  if (!pre.ok) return { ok: false, error: pre.error }

  const parsed = z
    .object({
      query: z.string().max(200).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.string().datetime().optional(),
    })
    .safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid_input' }

  const limit = parsed.data.limit ?? 50

  // Service-role: an administrator legitimately reads rows that are not their own, which RLS
  // forbids by design.
  const supabase = createAdminSupabaseClient()
  let q = supabase
    .from('users')
    .select('id, clerk_user_id, email, role, tier, entitlement_source, is_active, created_at')
    .order('created_at', { ascending: false })
    // One extra row tells us whether another page exists without a second query.
    .limit(limit + 1)

  if (parsed.data.cursor) q = q.lt('created_at', parsed.data.cursor)
  // % and _ are wildcards in ILIKE; escaping them keeps a literal search literal.
  if (parsed.data.query) {
    const escaped = parsed.data.query.replace(/[\\%_]/g, (c) => `\\${c}`)
    q = q.ilike('email', `%${escaped}%`)
  }

  const { data, error } = await q
  if (error) {
    // Distinguishable from an empty result — "no users" and "the database is down" must not look
    // the same to the administrator.
    console.error('[admin] listUsers failed', error.message)
    return { ok: false, error: 'unavailable' }
  }

  const rows = (data ?? []) as AdminUserRow[]
  const page = rows.slice(0, limit)
  const nextCursor = rows.length > limit ? page[page.length - 1].created_at : null
  return { ok: true, data: { users: page, nextCursor } }
}

export async function grantFounder(input: {
  clerkUserId: string
  tier?: Tier
  reason?: string
}): Promise<ActionResult> {
  const pre = await adminPreamble()
  if (!pre.ok) return { ok: false, error: pre.error }

  const parsed = z
    .object({
      clerkUserId: clerkUserIdSchema,
      // 'free' is rejected: a Founder with no entitlement is meaningless, and the table CHECK
      // would refuse it anyway.
      tier: z.enum(TIERS).refine((t) => t !== 'free', 'Founder tier cannot be free').optional(),
      reason: z.string().max(500).optional(),
    })
    .safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid_input' }
  if (refusesSelf(parsed.data.clerkUserId)) return { ok: false, error: 'forbidden' }

  const supabase = createAdminSupabaseClient()
  const { data: existing, error: readErr } = await supabase
    .from('users')
    .select('role')
    .eq('clerk_user_id', parsed.data.clerkUserId)
    .maybeSingle()

  if (readErr) return { ok: false, error: 'unavailable' }
  if (!existing) return { ok: false, error: 'not_found' }
  if (existing.role === 'founder') return { ok: false, error: 'already_founder' }

  const toTierValue: Tier = parsed.data.tier ?? 'cellar_master'

  return applyEntitlement({
    clerkUserId: parsed.data.clerkUserId,
    expectedRole: existing.role as Role,
    toRole: 'founder',
    toTier: toTierValue,
    toSource: 'founder_grant',
    actorId: pre.actorId,
    reason: parsed.data.reason,
  })
}

export async function revokeFounder(input: {
  clerkUserId: string
  reason?: string
}): Promise<ActionResult> {
  const pre = await adminPreamble()
  if (!pre.ok) return { ok: false, error: pre.error }

  const parsed = z
    .object({ clerkUserId: clerkUserIdSchema, reason: z.string().max(500).optional() })
    .safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid_input' }
  if (refusesSelf(parsed.data.clerkUserId)) return { ok: false, error: 'forbidden' }

  const supabase = createAdminSupabaseClient()
  const { data: existing, error: readErr } = await supabase
    .from('users')
    .select('role')
    .eq('clerk_user_id', parsed.data.clerkUserId)
    .maybeSingle()

  if (readErr) return { ok: false, error: 'unavailable' }
  if (!existing) return { ok: false, error: 'not_found' }
  if (existing.role !== 'founder') return { ok: false, error: 'not_founder' }

  // recomputeEntitlement(), not a literal reset — once subscriptions exist this resolves to
  // whatever the live subscription confers, with no change to this call site (FR-021).
  const next = recomputeEntitlement(parsed.data.clerkUserId)

  return applyEntitlement({
    clerkUserId: parsed.data.clerkUserId,
    expectedRole: 'founder',
    toRole: next.role,
    toTier: next.tier,
    toSource: next.source,
    actorId: pre.actorId,
    reason: parsed.data.reason,
  })
}

/**
 * The users update and the role_changes insert happen inside one Postgres function, so they land
 * together or not at all (FR-019). Doing them as two PostgREST calls left a window in which a
 * grant took effect with no audit row and the caller was told it succeeded.
 *
 * `expectedRole` is the optimistic-concurrency guard: if another administrator changed the row
 * between our read and this write, the function returns 'stale' rather than clobbering.
 */
async function applyEntitlement(args: {
  clerkUserId: string
  expectedRole: Role
  toRole: Role
  toTier: Tier
  toSource: EntitlementSource
  actorId: string
  reason?: string
}): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.rpc('set_user_entitlement', {
    p_clerk_user_id: args.clerkUserId,
    p_expected_role: args.expectedRole,
    p_to_role: args.toRole,
    p_to_tier: args.toTier,
    p_to_source: args.toSource,
    p_actor: args.actorId,
    p_reason: args.reason ?? null,
  })

  if (error) {
    console.error('[admin] set_user_entitlement failed', error.message)
    return { ok: false, error: 'unavailable' }
  }
  if (data === 'not_found') return { ok: false, error: 'not_found' }
  if (data === 'stale') return { ok: false, error: 'stale' }

  await syncClaims(args.clerkUserId, args.toRole, args.toTier)
  revalidatePath('/admin/users')
  return { ok: true }
}

/**
 * Mirror role and tier into Clerk public metadata so anything reading the token sees the current
 * values. This is a convenience mirror only — the guard resolves entitlement from Postgres on
 * every request, so a failure here cannot leave a revoked user entitled. That is precisely why
 * the failure is logged rather than failing the whole operation, which has already committed.
 */
async function syncClaims(targetClerkUserId: string, role: Role, tier: Tier) {
  try {
    const client = await clerkClient()
    await client.users.updateUserMetadata(targetClerkUserId, { publicMetadata: { role, tier } })
  } catch (err) {
    console.error('[admin] claim mirror failed; Postgres is authoritative, access is correct', err)
  }
}
