import 'server-only'
import { auth, currentUser } from '@clerk/nextjs/server'
import { serverEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ensureUserRow } from '@/lib/auth/sync-user'
import { meetsTier, toRole, toTier, type Role, type Tier } from '@/lib/auth/roles'

/**
 * The single authorization guard. Contract: specs/001-auth-user-model/contracts/role-guard.md
 *
 * One implementation deliberately serves segment layouts, route handlers and server actions — a
 * second would be a second place for the rules to drift.
 */

export type Requirement =
  | { authenticated: true }
  | { minTier: Tier }
  | { role: 'admin' }

export type Principal = {
  clerkUserId: string
  email: string
  role: Role
  tier: Tier
  isAdmin: boolean
}

export type GuardResult =
  | { ok: true; principal: Principal }
  | { ok: false; reason: 'unauthenticated'; returnTo: string }
  | { ok: false; reason: 'insufficient_tier'; required: Tier; actual: Tier }
  | { ok: false; reason: 'not_admin' }
  | { ok: false; reason: 'unavailable' }

/**
 * Only same-origin relative paths are ever handed back as returnTo, so a crafted request cannot
 * turn the sign-in redirect into an open redirect.
 */
export function safeReturnTo(candidate: string | null | undefined): string {
  if (!candidate) return '/'
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return '/'
  return candidate
}

export async function requireRole(req: Requirement): Promise<GuardResult> {
  try {
    const { isAuthenticated, userId, sessionClaims } = await auth()

    if (!isAuthenticated || !userId) {
      return { ok: false, reason: 'unauthenticated', returnTo: '/' }
    }

    // Admin is configuration, never a database value (FR-011, research R-010). The `role` column
    // may say 'admin' for display, but it is not consulted here.
    const isAdmin = userId === serverEnv().ADMIN_CLERK_USER_ID

    // Fast path: read role and tier off the session claim. A claim read is free; a Postgres
    // round-trip on every gated request is not, and SC-007 caps the gate at 100ms median.
    let role = sessionClaims?.role !== undefined ? toRole(sessionClaims.role) : null
    let tier = sessionClaims?.tier !== undefined ? toTier(sessionClaims.tier) : null
    let email = ''

    if (role === null || tier === null) {
      const supabase = createServerSupabaseClient()
      const { data, error } = await supabase
        .from('users')
        .select('email, role, tier, is_active')
        .eq('clerk_user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('[require-role] lookup failed', { userId, error: error.message })
        return { ok: false, reason: 'unavailable' }
      }

      if (!data) {
        // The webhook has not landed yet, or was missed. Provision now rather than erroring
        // (FR-007, research R-008).
        const clerkUser = await currentUser()
        const primaryEmail = clerkUser?.primaryEmailAddress?.emailAddress ?? ''
        const created = await ensureUserRow(userId, primaryEmail)
        if (!created) return { ok: false, reason: 'unavailable' }
        role = toRole(created.role)
        tier = toTier(created.tier)
        email = created.email
      } else {
        if (data.is_active === false) return { ok: false, reason: 'unavailable' }
        role = toRole(data.role)
        tier = toTier(data.tier)
        email = data.email ?? ''
      }
    }

    const principal: Principal = {
      clerkUserId: userId,
      email,
      role: role ?? 'registered',
      tier: tier ?? 'free',
      isAdmin,
    }

    if ('role' in req && req.role === 'admin') {
      return isAdmin ? { ok: true, principal } : { ok: false, reason: 'not_admin' }
    }

    if ('minTier' in req) {
      // The administrator is not exempted by fiat; they hold cellar_master entitlement in practice.
      if (isAdmin || meetsTier(principal.tier, req.minTier)) return { ok: true, principal }
      return {
        ok: false,
        reason: 'insufficient_tier',
        required: req.minTier,
        actual: principal.tier,
      }
    }

    if ('authenticated' in req) return { ok: true, principal }

    // No permissive default branch exists, and this line is why: an unhandled requirement shape
    // denies rather than falling through to a pass (Constitution Principle III).
    return { ok: false, reason: 'unavailable' }
  } catch (err) {
    // Fails closed on any error — Clerk unreachable, Supabase unreachable, malformed claim.
    // Never throws past its own boundary, never returns ok:true on an error path (FR-016).
    console.error('[require-role] failed closed', err)
    return { ok: false, reason: 'unavailable' }
  }
}
