import type { LineItem, LineResult, OakFormat, ToastLevel, OakType } from '@/lib/oak-calculator/types'
import { FORMAT_CONFIG, TOAST_CONFIG, OAK_TYPE_CONFIG, OAK_FORMATS } from '@/lib/oak-calculator/reference-data'

interface Props {
  line: LineItem
  result: LineResult | null
  onUpdate: (field: keyof Omit<LineItem, 'id'>, value: unknown) => void
  onRemove: () => void
}

export function LineItem({ line, result, onUpdate, onRemove }: Props) {
  return (
    <div className="rounded border border-stone-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Format */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-500">Format</label>
          <select
            value={line.format ?? ''}
            onChange={(e) => {
              const v = e.target.value
              onUpdate('format', v ? (v as OakFormat) : null)
            }}
            className="print:hidden rounded border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          >
            <option value="">Select…</option>
            {OAK_FORMATS.map((key) => (
              <option key={key} value={key}>
                {FORMAT_CONFIG[key].label}
              </option>
            ))}
          </select>
          {line.format && (
            <span className="hidden text-sm text-stone-800 print:inline">
              {FORMAT_CONFIG[line.format].label}
            </span>
          )}
        </div>

        {/* Toast */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-500">Toast</label>
          <select
            value={line.toastLevel ?? ''}
            onChange={(e) => {
              const v = e.target.value
              onUpdate('toastLevel', v ? (v as ToastLevel) : null)
            }}
            className="print:hidden rounded border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          >
            <option value="">Select…</option>
            {TOAST_CONFIG.map(({ code, label }) => (
              <option key={code} value={code}>
                {code} — {label}
              </option>
            ))}
          </select>
          {line.toastLevel && (
            <span className="hidden text-sm text-stone-800 print:inline">
              {line.toastLevel} — {TOAST_CONFIG.find((t) => t.code === line.toastLevel)?.label}
            </span>
          )}
        </div>

        {/* Oak type */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-500">Oak type</label>
          <select
            value={line.oakType ?? ''}
            onChange={(e) => {
              const v = e.target.value
              onUpdate('oakType', v ? (v as OakType) : null)
            }}
            className="print:hidden rounded border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          >
            <option value="">Select…</option>
            {OAK_TYPE_CONFIG.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {line.oakType && (
            <span className="hidden text-sm text-stone-800 print:inline">
              {OAK_TYPE_CONFIG.find((c) => c.value === line.oakType)?.label}
            </span>
          )}
        </div>

        {/* Supplier */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-500">
            Supplier <span className="print:hidden text-rose-600">*</span>
          </label>
          <input
            type="text"
            value={line.supplier}
            onChange={(e) => onUpdate('supplier', e.target.value)}
            placeholder="Supplier name"
            className="print:hidden rounded border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            aria-required="true"
          />
          {line.supplier && (
            <span className="hidden text-sm text-stone-800 print:inline">{line.supplier}</span>
          )}
        </div>

        {/* Share % */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-500">
            Share % <span className="print:hidden text-rose-600">*</span>
          </label>
          <input
            type="number"
            min={1}
            step={1}
            value={line.sharePct ?? ''}
            onChange={(e) => {
              const val = e.target.valueAsNumber
              onUpdate('sharePct', isNaN(val) ? null : Math.round(val))
            }}
            className="print:hidden rounded border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            aria-required="true"
          />
          {line.sharePct !== null && (
            <span className="hidden text-sm text-stone-800 print:inline">{line.sharePct}%</span>
          )}
        </div>
      </div>

      {/* Result + remove row */}
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          {result !== null && (
            <p className="text-base font-semibold text-stone-900">
              {result.quantity.toLocaleString('en-US')} {result.unit}
              {result.supplierNote && (
                <span className="ml-2 text-xs font-normal text-stone-500">
                  {result.supplierNote}
                </span>
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="print:hidden text-xs text-stone-400 hover:text-rose-600"
          aria-label="Remove line"
        >
          Remove
        </button>
      </div>
    </div>
  )
}
