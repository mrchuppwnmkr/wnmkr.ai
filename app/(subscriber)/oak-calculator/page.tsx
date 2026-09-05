import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/require-role'
import { UpgradePrompt } from '@/components/upgrade-prompt'
import { ServiceUnavailable } from '@/components/service-unavailable'
import { Worksheet } from '@/components/oak-calculator/worksheet'

// Independent auth check — the segment layout guard is NOT assumed to have run.
// Constitution Principle III: every page in (subscriber) re-checks entitlement itself.
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
    <section className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Oak Addition Worksheet</h1>
      <Worksheet />
    </section>
  )
}
