'use client'

import { useReducer } from 'react'
import { deriveWorksheet } from '@/lib/oak-calculator/calculate'
import type {
  WorksheetState,
  WorksheetAction,
  WorksheetHeader as WorksheetHeaderData,
  LineItem,
} from '@/lib/oak-calculator/types'
import { WorksheetHeader } from './worksheet-header'
import { ShareTotalIndicator } from './share-total-indicator'
import { LineItemList } from './line-item-list'
import { BatchSummary } from './batch-summary'
import { PrintButton } from './print-button'

const initialState: WorksheetState = {
  header: { volumeGallons: null, varietal: '', targetPct: null },
  lines: [],
}

function worksheetReducer(state: WorksheetState, action: WorksheetAction): WorksheetState {
  switch (action.type) {
    case 'SET_HEADER':
      return { ...state, header: { ...state.header, [action.field]: action.value } }
    case 'ADD_LINE':
      return {
        ...state,
        lines: [
          ...state.lines,
          {
            id: crypto.randomUUID(),
            format: null,
            toastLevel: null,
            oakType: null,
            supplier: '',
            sharePct: null,
          },
        ],
      }
    case 'UPDATE_LINE':
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.id === action.id ? { ...l, [action.field]: action.value } : l,
        ),
      }
    case 'REMOVE_LINE':
      return { ...state, lines: state.lines.filter((l) => l.id !== action.id) }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

export function Worksheet() {
  const [state, dispatch] = useReducer(worksheetReducer, initialState)
  const derived = deriveWorksheet(state.header, state.lines)

  const handleHeaderChange = (field: keyof WorksheetHeaderData, value: unknown) =>
    dispatch({ type: 'SET_HEADER', field, value })

  const handleUpdateLine = (id: string, field: keyof Omit<LineItem, 'id'>, value: unknown) =>
    dispatch({ type: 'UPDATE_LINE', id, field, value })

  return (
    <div className="space-y-6">
      <WorksheetHeader header={state.header} onHeaderChange={handleHeaderChange} />

      <ShareTotalIndicator shareTotal={derived.shareTotal} state={derived.shareTotalState} />

      <LineItemList
        lines={state.lines}
        lineResults={derived.lineResults}
        onAddLine={() => dispatch({ type: 'ADD_LINE' })}
        onUpdateLine={handleUpdateLine}
        onRemoveLine={(id) => dispatch({ type: 'REMOVE_LINE', id })}
      />

      {derived.canDisplay && derived.gallonsToTreat !== null && (
        <BatchSummary header={state.header} gallonsToTreat={derived.gallonsToTreat} />
      )}

      <p className="text-sm italic text-stone-500">
        Verify toast availability with your supplier — not all toast levels are offered in every
        format or oak type.
      </p>

      <PrintButton canPrint={derived.canPrint} />
    </div>
  )
}
