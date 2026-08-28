import 'server-only'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { Role, Tier, EntitlementSource } from '@/lib/auth/roles'

export type UserRow = {
  id: string
  clerk_user_id: string
  email: string | null
  role: Role
  tier: Tier
  entitlement_source: EntitlementSource
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Idempotent provisioning upsert, keyed on clerk_user_id.
 *
 * Used by two paths (research.md R-008): the Clerk webhook, which is primary; and a lazy fallback
 * in requireRole(), which closes the webhook's eventual-consistency window.
 *
 * Deliberately never writes role, tier or entitlement_source on an existing row. Clerk is not the
 * system of record for entitlement; letting a profile update touch it would make user-editable
 * data an authorization input.
 *
 * `email` may be null — a Clerk identity can exist without one.
 */
export async function ensureUserRow(
  clerkUserId: string,
  email: string | null,
): Promise<UserRow | null> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('users')
    .upsert({ clerk_user_id: clerkUserId, email }, { onConflict: 'clerk_user_id' })
    .select()
    .single()

  if (error) {
    console.error('[sync-user] upsert failed', { clerkUserId, error: error.message })
    return null
  }
  return data as UserRow
}

/**
 * The webhook variants throw rather than swallowing. A silent failure there returns 200 to Clerk,
 * which then never retries — so a lost deactivation is lost permanently. Throwing surfaces as a
 * 500, and every write here is an idempotent upsert, so the retry is safe.
 */
export async function updateUserEmail(clerkUserId: string, email: string | null): Promise<void> {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase
    .from('users')
    .upsert({ clerk_user_id: clerkUserId, email }, { onConflict: 'clerk_user_id' })
  if (error) throw new Error(`email update failed for ${clerkUserId}: ${error.message}`)
}

export async function deactivateUser(clerkUserId: string): Promise<void> {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('clerk_user_id', clerkUserId)
  if (error) throw new Error(`deactivate failed for ${clerkUserId}: ${error.message}`)
}
