import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { requireRole } from '@/lib/auth/require-role'
import { UpgradePrompt } from '@/components/upgrade-prompt'
import { ServiceUnavailable } from '@/components/service-unavailable'

/**
 * The subscriber gate. One layout covers this whole route group, so every current and future
 * subscriber-only page inherits it — a new page cannot forget to be protected.
 *
 * Route handlers and server actions under here still call requireRole() independently; the layout
 * guard is never assumed to have run (Constitution Principle III).
 */
export const dynamic = 'force-dynamic'

export default async function SubscriberLayout({ children }: { children: React.ReactNode }) {
  const result = await requireRole({ minTier: 'vintner' })

  if (!result.ok) {
    switch (result.reason) {
      case 'unauthenticated': {
        const path = (await headers()).get('x-pathname') ?? '/'
        redirect(`/auth/sign-in?return_to=${encodeURIComponent(path)}`)
      }
      // falls through — redirect() throws, so this is unreachable
      case 'insufficient_tier':
        return <UpgradePrompt required={result.required} />
      case 'not_admin':
      case 'unavailable':
      default:
        return <ServiceUnavailable />
    }
  }

  return <>{children}</>
}
