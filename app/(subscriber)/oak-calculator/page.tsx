import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/require-role'
import { UpgradePrompt } from '@/components/upgrade-prompt'
import { ServiceUnavailable } from '@/components/service-unavailable'

/**
 * Placeholder. The calculator itself is a later slice — this page exists so the subscriber gate
 * has a real subject and the acceptance scenarios have somewhere to land.
 *
 * It re-checks entitlement itself rather than relying on the group layout, because a layout and
 * its page render concurrently and a layout does not re-run on sibling navigation. Every page
 * added to this group must do the same.
 *
 * Reference values for the real build: claude/oak-calculator-reference.md.
 */
export default async function OakCalculatorPage() {
  const result = await requireRole({ minTier: 'vintner' })
  if (!result.ok) {
    if (result.reason === 'unauthenticated') {
      redirect(`/auth/sign-in?return_to=${encodeURIComponent(result.returnTo)}`)
    }
    if (result.reason === 'insufficient_tier') return <UpgradePrompt required={result.required} />
    return <ServiceUnavailable />
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold">Oak Addition Calculator</h1>
      <p className="mt-3 text-stone-600">
        You have subscriber access. The calculator is being built — chips, dominoes, mini staves and
        tank staves, with Mike&rsquo;s addition rates and toast codes.
      </p>
    </section>
  )
}
