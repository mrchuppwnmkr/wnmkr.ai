import { verifyWebhook } from '@clerk/nextjs/webhooks'
import type { NextRequest } from 'next/server'
import { ensureUserRow, updateUserEmail, deactivateUser } from '@/lib/auth/sync-user'

/**
 * Clerk -> Supabase user sync.
 * Contract: specs/001-auth-user-model/contracts/clerk-webhook.md
 *
 * verifyWebhook() replaces hand-rolled svix verification. The signing secret is
 * CLERK_WEBHOOK_SIGNING_SECRET (older docs said WEBHOOK_SECRET / SIGNING_SECRET).
 */
export async function POST(req: NextRequest) {
  let evt
  try {
    evt = await verifyWebhook(req)
  } catch (err) {
    console.error('[clerk-webhook] verification failed', err)
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    switch (evt.type) {
      case 'user.created': {
        const created = await ensureUserRow(evt.data.id, primaryEmail(evt.data))
        // A swallowed failure would return 200 and Clerk would never retry, losing the row.
        if (!created) throw new Error(`provisioning failed for ${evt.data.id}`)
        break
      }
      case 'user.updated': {
        // Email only. Clerk is not the system of record for entitlement, and letting a profile
        // update write role or tier would make user-editable data an authorization input.
        await updateUserEmail(evt.data.id, primaryEmail(evt.data))
        break
      }
      case 'user.deleted': {
        if (evt.data.id) await deactivateUser(evt.data.id)
        break
      }
      default:
        // Acknowledge so Clerk does not retry events we do not handle.
        break
    }
    return new Response('ok', { status: 200 })
  } catch (err) {
    // 5xx makes Clerk retry, which is safe: every write above is an idempotent upsert.
    console.error('[clerk-webhook] handler failed', { type: evt.type, err })
    return new Response('Handler error', { status: 500 })
  }
}

type ClerkEmailPayload = {
  primary_email_address_id?: string | null
  email_addresses?: {
    id: string
    email_address: string
    verification?: { status?: string | null } | null
  }[]
}

/**
 * The address the admin UI will show and search on. Only the designated primary is used, and only
 * when verified — falling back to "whatever is first in the array" risks storing an unverified
 * secondary address as someone's identity, which is what an administrator then grants Founder to.
 * Returns null rather than guessing; the column is nullable for exactly this case.
 */
function primaryEmail(data: unknown): string | null {
  const d = data as ClerkEmailPayload
  const primary = (d.email_addresses ?? []).find((a) => a.id === d.primary_email_address_id)
  if (!primary) return null
  const status = primary.verification?.status
  if (status && status !== 'verified') return null
  return primary.email_address ?? null
}
