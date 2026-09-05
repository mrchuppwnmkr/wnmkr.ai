import type { WorksheetHeader } from '@/lib/oak-calculator/types'

interface Props {
  header: WorksheetHeader
  gallonsToTreat: number
}

export function BatchSummary({ header, gallonsToTreat }: Props) {
  const vol = header.volumeGallons!.toLocaleString('en-US')
  const treat = gallonsToTreat.toLocaleString('en-US')

  return (
    <div className="rounded border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
      <p className="font-semibold text-stone-800">Batch Summary</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-stone-500">Volume</dt>
          <dd className="font-medium text-stone-900">{vol} gal</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Varietal</dt>
          <dd className="font-medium text-stone-900">{header.varietal}</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Target % new oak</dt>
          <dd className="font-medium text-stone-900">{header.targetPct}%</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Gallons to treat</dt>
          <dd className="font-medium text-stone-900">{treat} gal</dd>
        </div>
      </dl>
    </div>
  )
}
