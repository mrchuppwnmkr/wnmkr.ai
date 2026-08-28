import { z } from 'zod'

/**
 * Environment access, validated once at module load.
 *
 * Constitution (Technology Stack & Constraints): secrets come from the environment and are never
 * committed. Validating here means a missing variable fails immediately with a named error rather
 * than surfacing later as a confusing runtime fault.
 */
const serverSchema = z.object({
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1),
  ADMIN_CLERK_USER_ID: z.string().startsWith('user_'),
  SUPABASE_SECRET_KEY: z.string().min(1),
})

const publicSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})

function parse<T extends z.ZodTypeAny>(schema: T, source: Record<string, string | undefined>) {
  const result = schema.safeParse(source)
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(`Invalid or missing environment variables: ${missing}. See .env.example.`)
  }
  return result.data as z.infer<T>
}

let cachedPublicEnv: z.infer<typeof publicSchema> | null = null
let cachedServerEnv: z.infer<typeof serverSchema> | null = null

/**
 * Public values are inlined by Next at build time, so they must be referenced literally rather
 * than read off a spread of process.env.
 *
 * Parsed lazily rather than at module load: a module-load throw would make `next build` require
 * real credentials, and the constitution's build gate has to pass from a clean checkout. First
 * actual use still fails fast with a named error.
 */
export function publicEnv() {
  if (cachedPublicEnv) return cachedPublicEnv
  cachedPublicEnv = parse(publicSchema, {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  })
  return cachedPublicEnv
}

/** Server-only. Lazily parsed so importing this module from a client bundle cannot throw. */
export function serverEnv() {
  if (cachedServerEnv) return cachedServerEnv
  cachedServerEnv = parse(serverSchema, {
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SIGNING_SECRET: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
    ADMIN_CLERK_USER_ID: process.env.ADMIN_CLERK_USER_ID,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  })
  return cachedServerEnv
}
