import type { LineItem as LineItemType, LineResult } from '@/lib/oak-calculator/types'
import { LineItem } from './line-item'

interface Props {
  lines: LineItemType[]
  lineResults: LineResult[]
  onAddLine: () => void
  onUpdateLine: (id: string, field: keyof Omit<LineItemType, 'id'>, value: unknown) => void
  onRemoveLine: (id: string) => void
}

export function LineItemList({ lines, lineResults, onAddLine, onUpdateLine, onRemoveLine }: Props) {
  return (
    <div className="space-y-3">
      {lines.length === 0 && (
        <p className="print:hidden rounded border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
          No lines yet. Add a product line to begin.
        </p>
      )}

      {lines.map((line) => {
        const result = lineResults.find((r) => r.lineId === line.id) ?? null
        return (
          <LineItem
            key={line.id}
            line={line}
            result={result}
            onUpdate={(field, value) => onUpdateLine(line.id, field, value)}
            onRemove={() => onRemoveLine(line.id)}
          />
        )
      })}

      <button
        type="button"
        onClick={onAddLine}
        className="print:hidden mt-2 rounded border border-dashed border-stone-300 px-4 py-2 text-sm text-stone-600 hover:border-stone-400 hover:text-stone-800"
      >
        + Add line
      </button>
    </div>
  )
}
