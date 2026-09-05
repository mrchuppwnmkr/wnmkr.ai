import type { ShareTotalState } from '@/lib/oak-calculator/types'

interface Props {
  shareTotal: number
  state: ShareTotalState
}

export function ShareTotalIndicator({ shareTotal, state }: Props) {
  const config = {
    incomplete: {
      label: `${shareTotal}% — Incomplete`,
      className: 'bg-amber-50 text-amber-800 border-amber-300',
      dot: 'bg-amber-400',
    },
    valid: {
      label: '100% — Complete',
      className: 'bg-green-50 text-green-800 border-green-300',
      dot: 'bg-green-500',
    },
    over: {
      label: `${shareTotal}% — Over 100%`,
      className: 'bg-rose-50 text-rose-800 border-rose-300',
      dot: 'bg-rose-500',
    },
  }[state]

  return (
    <div className={`print:hidden flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium ${config.className}`}>
      <span className={`inline-block h-2 w-2 rounded-full ${config.dot}`} aria-hidden="true" />
      <span>{config.label}</span>
    </div>
  )
}
