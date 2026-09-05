import type {
  WorksheetHeader,
  LineItem,
  WorksheetDerived,
  LineResult,
  ShareTotalState,
} from './types'
import { FORMAT_CONFIG } from './reference-data'

export function calculateLine(gallonsToTreat: number, line: LineItem): LineResult | null {
  if (line.format === null || line.sharePct === null || line.sharePct < 1) return null

  const config = FORMAT_CONFIG[line.format]
  const lineGallons = gallonsToTreat * (line.sharePct / 100)
  const rawQuantity = lineGallons * (config.ratePerThousand / 1000)
  const quantity = Math.ceil(rawQuantity)

  return {
    lineId: line.id,
    lineGallons,
    quantity,
    unit: config.unit,
    supplierNote: config.supplierNote,
  }
}

export function deriveWorksheet(
  header: WorksheetHeader,
  lines: LineItem[],
): WorksheetDerived {
  const shareTotal = lines.reduce((s, l) => s + (l.sharePct ?? 0), 0)

  const shareTotalState: ShareTotalState =
    shareTotal < 100 ? 'incomplete' : shareTotal === 100 ? 'valid' : 'over'

  const headerValid =
    header.volumeGallons !== null &&
    isFinite(header.volumeGallons) &&
    header.volumeGallons >= 1 &&
    header.volumeGallons <= 1_000_000 &&
    header.targetPct !== null &&
    Number.isInteger(header.targetPct) &&
    header.targetPct >= 1 &&
    header.targetPct <= 100

  if (!headerValid || shareTotalState !== 'valid') {
    return {
      gallonsToTreat: null,
      shareTotal,
      shareTotalState,
      lineResults: [],
      canDisplay: false,
      canPrint: false,
    }
  }

  // Both values are non-null after the headerValid check above
  const gallonsToTreat = header.volumeGallons! * (header.targetPct! / 100)

  // Null returns from calculateLine are omitted; a line with null format or sharePct has no entry
  const lineResults: LineResult[] = lines
    .map((line) => calculateLine(gallonsToTreat, line))
    .filter((r): r is LineResult => r !== null)

  const headerRequiredFilled = header.varietal.trim().length > 0
  const allLinesRequiredFilled = lines.every(
    (l) =>
      l.format !== null &&
      l.toastLevel !== null &&
      l.oakType !== null &&
      l.supplier.trim().length > 0 &&
      l.sharePct !== null &&
      l.sharePct >= 1,
  )
  const canPrint = headerRequiredFilled && allLinesRequiredFilled

  return {
    gallonsToTreat,
    shareTotal,
    shareTotalState,
    lineResults,
    canDisplay: true,
    canPrint,
  }
}
