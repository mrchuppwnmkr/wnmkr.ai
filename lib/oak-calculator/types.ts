export type OakFormat = 'chips' | 'dominoes' | 'mini-staves' | 'tank-staves'

export type ToastLevel = 'UT' | 'LT' | 'M' | 'M+' | 'H' | 'CON' | 'EXT'

export type OakType = 'american' | 'french' | 'east-european' | 'other'

export type ShareTotalState = 'incomplete' | 'valid' | 'over'

export type WorksheetHeader = {
  volumeGallons: number | null
  varietal: string
  targetPct: number | null
}

export type LineItem = {
  id: string
  format: OakFormat | null
  toastLevel: ToastLevel | null
  oakType: OakType | null
  supplier: string
  sharePct: number | null
}

export type WorksheetState = {
  header: WorksheetHeader
  lines: LineItem[]
}

export type WorksheetAction =
  | { type: 'SET_HEADER'; field: keyof WorksheetHeader; value: unknown }
  | { type: 'ADD_LINE' }
  | { type: 'UPDATE_LINE'; id: string; field: keyof Omit<LineItem, 'id'>; value: unknown }
  | { type: 'REMOVE_LINE'; id: string }
  | { type: 'RESET' }

export type LineResult = {
  lineId: string
  lineGallons: number
  quantity: number
  unit: 'lbs' | 'staves' | 'sq ft'
  supplierNote: string | null
}

export type WorksheetDerived = {
  gallonsToTreat: number | null
  shareTotal: number
  shareTotalState: ShareTotalState
  lineResults: LineResult[]
  canDisplay: boolean
  canPrint: boolean
}

export type FormatConfig = {
  label: string
  ratePerThousand: number
  unit: 'lbs' | 'staves' | 'sq ft'
  contactTime: string
  supplierNote: string | null
}

export type ToastConfig = {
  code: ToastLevel
  label: string
}

export type OakTypeConfig = {
  value: OakType
  label: string
}
