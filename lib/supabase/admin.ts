import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { publicEnv, serverEnv } from '@/lib/env'

/**
 * Service-role client. THIS BYPASSES ROW LEVEL SECURITY ENTIRELY.
 *
 * Permitted in exactly two places:
 *   1. app/api/webhooks/clerk/route.ts — writes a user row before any session for that user
 *      exists, so there is no Clerk token to scope RLS with.
 *   2. app/admin/users/actions.ts — an administrator legitimately reads rows that are not their
 *      own, which RLS forbids by design. Every caller there is behind requireRole({role:'admin'}).
 *
 * Never combine this with the `accessToken` callback: the RLS bypass makes the token meaningless
 * and silently voids per-user isolation. Never import from a client component.
 * See specs/001-auth-user-model/research.md R-007.
 */
export function createAdminSupabaseClient() {
  return createClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
