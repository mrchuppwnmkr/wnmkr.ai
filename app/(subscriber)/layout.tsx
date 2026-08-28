import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/require-role'
import { UpgradePrompt } from '@/components/upgrade-prompt'
import { ServiceUnavailable } from '@/components/service-unavailable'

/**
 * The subscriber gate for this route group.
 *
 * IMPORTANT — this layout is a convenience, not the whole control. Next.js renders a layout and
 * the page beneath it concurrently, and does not re-run a layout on client-side navigation
 * between sibling segments under it. So every page in this group that reads privileged data must
 * call requireRole() itself as well. The layout catches the page that forgets; it does not excuse
 * one from checking (Constitution Principle III).
 */
export const dynamic = 'force-dynamic'

export default async function SubscriberLayout({ children }: { children: React.ReactNode }) {
  const result = await requireRole({ minTier: 'vintner' })

  if (!result.ok) {
    if (result.reason === 'unauthenticated') {
      redirect(`/auth/sign-in?return_to=${encodeURIComponent(result.returnTo)}`)
    }
    if (result.reason === 'insufficient_tier') {
      return <UpgradePrompt required={result.required} />
    }
    return <ServiceUnavailable />
  }

  return <>{children}</>
}
