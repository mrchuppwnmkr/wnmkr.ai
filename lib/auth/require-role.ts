import 'server-only'
import { auth, currentUser } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { serverEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ensureUserRow } from '@/lib/auth/sync-user'
import { meetsTier, toRole, toTier, type Role, type Tier } from '@/lib/auth/roles'
import { safeReturnTo } from '@/lib/auth/return-to'

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
 * The path the person actually asked for, so they can be returned to it after signing in (FR-006).
 * `x-pathname` is stamped by proxy.ts with `Headers.set`, which overwrites any client-supplied
 * value — but it is validated here regardless, because a request that somehow bypasses the proxy
 * matcher must not be able to steer the redirect.
 */
async function currentPath(): Promise<string> {
  try {
    return safeReturnTo((await headers()).get('x-pathname'))
  } catch {
    return '/'
  }
}

export { safeReturnTo }

export async function requireRole(req: Requirement): Promise<GuardResult> {
  try {
    const { isAuthenticated, userId } = await auth()

    if (!isAuthenticated || !userId) {
      return { ok: false, reason: 'unauthenticated', returnTo: await currentPath() }
    }

    // Admin is configuration, never a database value (FR-011, research R-010). The `role` column
    // may say 'admin' for display, but it is not consulted here.
    const isAdmin = userId === serverEnv().ADMIN_CLERK_USER_ID

    // Entitlement is resolved from Postgres on every request, never from the session claim.
    //
    // An earlier design read `sessionClaims.role` as a fast path. It was wrong in three ways: a
    // failed metadata write left a revoked Founder permanently entitled with no way for the
    // database to correct it; `is_active` was enforced on the database path and skipped on the
    // claim path; and it made an authorization decision out of a value the token carries rather
    // than one the system of record holds. See research.md R-004.
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

    let role: Role
    let tier: Tier
    let email: string

    if (!data) {
      // The webhook has not landed yet, or was missed. Provision now rather than erroring
      // (FR-007, research R-008).
      const clerkUser = await currentUser()
      const created = await ensureUserRow(
        userId,
        clerkUser?.primaryEmailAddress?.emailAddress ?? null,
      )
      if (!created) return { ok: false, reason: 'unavailable' }
      role = toRole(created.role)
      tier = toTier(created.tier)
      email = created.email ?? ''
    } else {
      // A deactivated account is refused on every path, not only some of them.
      if (data.is_active === false) return { ok: false, reason: 'unavailable' }
      role = toRole(data.role)
      tier = toTier(data.tier)
      email = data.email ?? ''
    }

    const principal: Principal = { clerkUserId: userId, email, role, tier, isAdmin }

    if ('role' in req && req.role === 'admin') {
      return isAdmin ? { ok: true, principal } : { ok: false, reason: 'not_admin' }
    }

    if ('minTier' in req) {
      // The administrator is not exempted by fiat; they hold top-tier entitlement in practice.
      if (isAdmin || meetsTier(principal.tier, req.minTier)) return { ok: true, principal }
      return { ok: false, reason: 'insufficient_tier', required: req.minTier, actual: principal.tier }
    }

    if ('authenticated' in req) return { ok: true, principal }

    // No permissive default branch exists, and this line is why: an unhandled requirement shape
    // denies rather than falling through to a pass (Constitution Principle III).
    return { ok: false, reason: 'unavailable' }
  } catch (err) {
    // Fails closed on any error — Clerk unreachable, Supabase unreachable, malformed response.
    // Never throws past its own boundary, never returns ok:true on an error path (FR-016).
    console.error('[require-role] failed closed', err)
    return { ok: false, reason: 'unavailable' }
  }
}
