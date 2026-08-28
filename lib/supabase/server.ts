import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { publicEnv } from '@/lib/env'

/**
 * Request-scoped Supabase client. RLS applies, because Supabase validates the Clerk session token
 * against Clerk's public JWKS via Third-Party Auth.
 *
 * The `accessToken` callback fires per request, so one factory is safe to call from Server
 * Components, Server Actions and Route Handlers alike. `@supabase/ssr` is deliberately not used —
 * it exists to persist Supabase Auth's own cookies, and Clerk owns the cookie here.
 * See specs/001-auth-user-model/research.md R-007.
 */
export function createServerSupabaseClient() {
  return createClient(
    publicEnv().NEXT_PUBLIC_SUPABASE_URL,
    publicEnv().NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      async accessToken() {
        return (await auth()).getToken()
      },
    },
  )
}
