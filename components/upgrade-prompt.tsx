import Link from 'next/link'
import type { Tier } from '@/lib/auth/roles'

const TIER_LABEL: Record<Tier, string> = {
  free: 'Free',
  vintner: 'Vintner',
  winemaker: 'Winemaker',
  cellar_master: 'Cellar Master',
}

/**
 * Shown when a signed-in person lacks the entitlement for a page (FR-015). It explains what access
 * they would need and how to get it, rather than presenting a dead end.
 */
export function UpgradePrompt({ required }: { required: Tier }) {
  return (
    <section className="mx-auto max-w-lg rounded-lg border border-stone-200 bg-white p-8 text-center">
      <h1 className="text-xl font-semibold">This is a subscriber tool</h1>
      <p className="mt-3 text-sm text-stone-600">
        The {TIER_LABEL[required]} subscription and above include the Oak Addition Calculator, the
        full AI Winemaking Consultant, and your query history.
      </p>
      <Link
        href="/pricing"
        className="mt-6 inline-block rounded bg-rose-800 px-5 py-2 text-sm font-medium text-white hover:bg-rose-900"
      >
        See subscription options
      </Link>
    </section>
  )
}
