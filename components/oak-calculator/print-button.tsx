'use client'

interface Props {
  canPrint: boolean
}

export function PrintButton({ canPrint }: Props) {
  return (
    <button
      type="button"
      onClick={() => { if (canPrint) window.print() }}
      disabled={!canPrint}
      aria-disabled={!canPrint}
      className={`print:hidden rounded px-5 py-2 text-sm font-medium transition-colors ${
        canPrint
          ? 'bg-stone-800 text-white hover:bg-stone-700'
          : 'cursor-not-allowed bg-stone-200 text-stone-400'
      }`}
    >
      Print work order
    </button>
  )
}
