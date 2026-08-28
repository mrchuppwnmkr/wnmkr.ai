import Image from 'next/image'
import Link from 'next/link'

/**
 * Landing page, ported from the static index.html that currently serves wnmkr.ai via GitHub Pages.
 * index.html is deliberately left in the repo — it remains the live site and the source of record
 * for this copy until the Vercel cutover (see docs/vercel-cutover.md).
 */
export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-rose-800">
            Lodi · Livermore · Russian River Valley
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
            An AI winemaking consultant, built on real cellar experience.
          </h1>
          <p className="mt-5 text-stone-600">
            Combining the winemaking knowledge of Steve Burch and Michael Chupp with the best
            research available — for growers and winemakers who need an answer before the next
            pump-over.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/auth/sign-up"
              className="rounded bg-rose-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-900"
            >
              Create an account
            </Link>
            <Link
              href="/pricing"
              className="rounded border border-stone-300 px-5 py-2.5 text-sm font-medium hover:bg-stone-100"
            >
              Pricing
            </Link>
          </div>
        </div>
        <Image
          src="/assets/hero-cluster-bottle.jpg"
          alt=""
          width={800}
          height={600}
          className="rounded-lg object-cover"
          unoptimized
          priority
        />
      </section>

      <section className="grid gap-8 md:grid-cols-3">
        {[
          {
            title: 'AI Winemaking Consultant',
            body: 'Ask about fermentation, additions, faults or timing. Three questions free — no account needed.',
          },
          {
            title: 'Oak Addition Calculator',
            body: 'Chips, dominoes, mini staves and tank staves, with real addition rates and toast codes.',
          },
          {
            title: 'Answers you can trace',
            body: 'Recommendations come from sourced reference data, not invented numbers.',
          },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border border-stone-200 bg-white p-6">
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm text-stone-600">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
