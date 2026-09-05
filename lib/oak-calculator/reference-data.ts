import type { OakFormat, FormatConfig, ToastLevel, ToastConfig, OakType, OakTypeConfig } from './types'

export const FORMAT_CONFIG: Record<OakFormat, FormatConfig> = {
  chips: {
    label: 'Chips / Beans',
    ratePerThousand: 25,
    unit: 'lbs',
    contactTime: '1–4 weeks',
    supplierNote: null,
  },
  dominoes: {
    label: 'Dominoes / Cubes',
    ratePerThousand: 60,
    unit: 'lbs',
    contactTime: '2–8 weeks',
    supplierNote: null,
  },
  'mini-staves': {
    label: 'Mini Staves',
    // From catalog product OC1 — only mini stave product in source workbook; no blend sheet in the
    // source workbook verified this rate in production use. Confirm with Mike before relying on it.
    ratePerThousand: 135.59,
    unit: 'staves',
    contactTime: 'weeks–months',
    supplierNote: null,
  },
  'tank-staves': {
    label: 'Tank / Fan Staves',
    ratePerThousand: 390,
    unit: 'sq ft',
    contactTime: 'months',
    supplierNote: 'Check with your supplier for sq ft per stave.',
  },
}

export const TOAST_CONFIG: ToastConfig[] = [
  { code: 'UT', label: 'Untoasted' },
  { code: 'LT', label: 'Light' },
  { code: 'M', label: 'Medium' },
  { code: 'M+', label: 'Medium+' },
  { code: 'H', label: 'Heavy' },
  { code: 'CON', label: 'Connective / Savour' },
  { code: 'EXT', label: 'Extended' },
]

export const OAK_TYPE_CONFIG: OakTypeConfig[] = [
  { value: 'french', label: 'French' },
  { value: 'american', label: 'American' },
  { value: 'east-european', label: 'East European' },
  { value: 'other', label: 'Other' },
]

// Ordered list of format keys for consistent rendering
export const OAK_FORMATS: OakFormat[] = ['chips', 'dominoes', 'mini-staves', 'tank-staves']

export const OAK_TYPES: OakType[] = ['french', 'american', 'east-european', 'other']

export const TOAST_LEVELS: ToastLevel[] = ['UT', 'LT', 'M', 'M+', 'H', 'CON', 'EXT']
