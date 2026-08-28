const TIERS = [
  { name: 'Vintner', price: '$25/mo', queries: '100 queries/mo · 15/day', extra: 'Oak Calculator, 30-day history' },
  { name: 'Winemaker', price: '$49/mo', queries: '400 queries/mo · 30/day', extra: 'Unlimited history, PDF export, priority queue' },
  { name: 'Cellar Master', price: '$99/mo', queries: '1,500 queries/mo', extra: 'Multi-batch tracking, Calculator API access' },
]

export default function PricingPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Pricing</h1>
      <p className="mt-2 text-sm text-stone-600">
        Private beta. Subscriptions open at public launch — Founder accounts are invited directly.
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {TIERS.map((t) => (
          <div key={t.name} className="rounded-lg border border-stone-200 bg-white p-6">
            <h2 className="font-semibold">{t.name}</h2>
            <p className="mt-1 text-2xl font-semibold text-rose-800">{t.price}</p>
            <p className="mt-3 text-sm text-stone-600">{t.queries}</p>
            <p className="mt-1 text-sm text-stone-600">{t.extra}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
