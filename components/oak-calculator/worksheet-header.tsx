'use client'

import { useState } from 'react'
import type { WorksheetHeader } from '@/lib/oak-calculator/types'

interface Props {
  header: WorksheetHeader
  onHeaderChange: (field: keyof WorksheetHeader, value: unknown) => void
}

export function WorksheetHeader({ header, onHeaderChange }: Props) {
  const [touched, setTouched] = useState({ volumeGallons: false, varietal: false, targetPct: false })

  const mark = (field: keyof typeof touched) =>
    setTouched((prev) => ({ ...prev, [field]: true }))

  const volumeInvalid = touched.volumeGallons && (header.volumeGallons === null || header.volumeGallons < 1 || header.volumeGallons > 1_000_000)
  const varietalEmpty = touched.varietal && header.varietal.trim().length === 0
  const targetEmpty = touched.targetPct && header.targetPct === null

  return (
    <fieldset className="print:hidden space-y-4">
      <legend className="text-sm font-semibold uppercase tracking-wide text-stone-500">
        Batch Header
      </legend>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Volume */}
        <div className="flex flex-col gap-1">
          <label htmlFor="volume" className="text-sm font-medium text-stone-700">
            Volume (gal) <span className="text-rose-600">*</span>
          </label>
          <input
            id="volume"
            type="number"
            min={1}
            max={1_000_000}
            value={header.volumeGallons ?? ''}
            onChange={(e) => {
              const val = e.target.valueAsNumber
              onHeaderChange('volumeGallons', isNaN(val) ? null : val)
            }}
            onBlur={() => mark('volumeGallons')}
            className={`rounded border px-3 py-2 text-sm ${
              volumeInvalid ? 'border-rose-400 bg-rose-50' : 'border-stone-300'
            } focus:outline-none focus:ring-2 focus:ring-stone-400`}
            aria-required="true"
            aria-invalid={volumeInvalid}
          />
          {volumeInvalid && (
            <p className="text-xs text-rose-600">Enter a value between 1 and 1,000,000</p>
          )}
        </div>

        {/* Varietal */}
        <div className="flex flex-col gap-1">
          <label htmlFor="varietal" className="text-sm font-medium text-stone-700">
            Varietal <span className="text-rose-600">*</span>
          </label>
          <input
            id="varietal"
            type="text"
            value={header.varietal}
            onChange={(e) => onHeaderChange('varietal', e.target.value)}
            onBlur={() => mark('varietal')}
            className={`rounded border px-3 py-2 text-sm ${
              varietalEmpty ? 'border-rose-400 bg-rose-50' : 'border-stone-300'
            } focus:outline-none focus:ring-2 focus:ring-stone-400`}
            aria-required="true"
            aria-invalid={varietalEmpty}
          />
          {varietalEmpty && (
            <p className="text-xs text-rose-600">Required</p>
          )}
        </div>

        {/* Target % */}
        <div className="flex flex-col gap-1">
          <label htmlFor="target-pct" className="text-sm font-medium text-stone-700">
            Target % new oak <span className="text-rose-600">*</span>
          </label>
          <input
            id="target-pct"
            type="number"
            min={1}
            max={100}
            step={1}
            value={header.targetPct ?? ''}
            onChange={(e) => {
              const val = e.target.valueAsNumber
              onHeaderChange('targetPct', isNaN(val) ? null : Math.round(val))
            }}
            onBlur={() => mark('targetPct')}
            className={`rounded border px-3 py-2 text-sm ${
              targetEmpty ? 'border-rose-400 bg-rose-50' : 'border-stone-300'
            } focus:outline-none focus:ring-2 focus:ring-stone-400`}
            aria-required="true"
            aria-invalid={targetEmpty}
          />
          {targetEmpty && (
            <p className="text-xs text-rose-600">Required</p>
          )}
        </div>
      </div>
    </fieldset>
  )
}
