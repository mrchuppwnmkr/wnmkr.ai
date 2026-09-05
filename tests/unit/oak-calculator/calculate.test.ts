import { describe, it, expect } from 'vitest'
import { calculateLine, deriveWorksheet } from '@/lib/oak-calculator/calculate'
import type { LineItem, WorksheetHeader } from '@/lib/oak-calculator/types'

// Helpers
function makeHeader(
  volumeGallons: number | null,
  targetPct: number | null,
  varietal = 'Test Varietal',
): WorksheetHeader {
  return { volumeGallons, targetPct, varietal }
}

function makeLine(overrides: Partial<LineItem> = {}): LineItem {
  return {
    id: 'test-id',
    format: 'chips',
    toastLevel: 'M',
    oakType: 'french',
    supplier: 'Test Supplier',
    sharePct: 100,
    ...overrides,
  }
}

// ─── calculateLine ────────────────────────────────────────────────────────────

describe('calculateLine — reference table rows', () => {
  // All eleven rows from quickstart.md Calculation Reference Table

  it('row 1: chips 1,000 gal to treat × 100% share → 25 lbs', () => {
    const result = calculateLine(1000, makeLine({ format: 'chips', sharePct: 100 }))
    expect(result?.quantity).toBe(25)
    expect(result?.unit).toBe('lbs')
  })

  it('row 2: dominoes 500 gal to treat × 100% share → 30 lbs', () => {
    const result = calculateLine(500, makeLine({ format: 'dominoes', sharePct: 100 }))
    expect(result?.quantity).toBe(30)
    expect(result?.unit).toBe('lbs')
  })

  it('row 3: mini-staves 500 gal to treat × 100% share → 68 staves', () => {
    const result = calculateLine(500, makeLine({ format: 'mini-staves', sharePct: 100 }))
    expect(result?.quantity).toBe(68)
    expect(result?.unit).toBe('staves')
  })

  it('row 4: tank-staves 500 gal to treat × 100% share → 195 sq ft', () => {
    const result = calculateLine(500, makeLine({ format: 'tank-staves', sharePct: 100 }))
    expect(result?.quantity).toBe(195)
    expect(result?.unit).toBe('sq ft')
  })

  it('row 5: chips 1,500 gal to treat × 50% share → 19 lbs (18.75 → ceil)', () => {
    const result = calculateLine(1500, makeLine({ format: 'chips', sharePct: 50 }))
    expect(result?.quantity).toBe(19)
  })

  it('row 6: mini-staves 1,500 gal to treat × 50% share → 102 staves (101.693 → ceil)', () => {
    const result = calculateLine(1500, makeLine({ format: 'mini-staves', sharePct: 50 }))
    expect(result?.quantity).toBe(102)
  })

  it('row 7: chips 2,000 gal to treat × 33% share → 17 lbs (16.5 → ceil)', () => {
    const result = calculateLine(2000, makeLine({ format: 'chips', sharePct: 33 }))
    expect(result?.quantity).toBe(17)
  })

  it('row 8: mini-staves 2,000 gal to treat × 34% share → 93 staves (92.201 → ceil)', () => {
    const result = calculateLine(2000, makeLine({ format: 'mini-staves', sharePct: 34 }))
    expect(result?.quantity).toBe(93)
  })

  it('row 9: dominoes 2,000 gal to treat × 33% share → 40 lbs (39.6 → ceil)', () => {
    const result = calculateLine(2000, makeLine({ format: 'dominoes', sharePct: 33 }))
    expect(result?.quantity).toBe(40)
  })

  it('row 10: mini-staves 600 gal to treat × 100% share → 82 staves (81.354 → ceil)', () => {
    const result = calculateLine(600, makeLine({ format: 'mini-staves', sharePct: 100 }))
    expect(result?.quantity).toBe(82)
  })

  it('row 11: tank-staves 10,000 gal to treat × 100% share → 3,900 sq ft', () => {
    const result = calculateLine(10000, makeLine({ format: 'tank-staves', sharePct: 100 }))
    expect(result?.quantity).toBe(3900)
    expect(result?.unit).toBe('sq ft')
  })
})

describe('calculateLine — ceiling rounding', () => {
  it('exact integer result is unchanged (no rounding up)', () => {
    // chips: 1,000 gal × 100% × 25/1,000 = 25.0 exactly → 25
    const result = calculateLine(1000, makeLine({ format: 'chips', sharePct: 100 }))
    expect(result?.quantity).toBe(25)
  })

  it('fractional result rounds up', () => {
    // chips: 1,500 gal × 50% × 25/1,000 = 18.75 → 19
    const result = calculateLine(1500, makeLine({ format: 'chips', sharePct: 50 }))
    expect(result?.quantity).toBe(19)
  })

  it('quantity is always a positive integer', () => {
    const result = calculateLine(1000, makeLine({ format: 'chips', sharePct: 1 }))
    expect(result).not.toBeNull()
    expect(Number.isInteger(result!.quantity)).toBe(true)
    expect(result!.quantity).toBeGreaterThan(0)
  })
})

describe('calculateLine — null returns', () => {
  it('returns null when format is null', () => {
    expect(calculateLine(1000, makeLine({ format: null }))).toBeNull()
  })

  it('returns null when sharePct is null', () => {
    expect(calculateLine(1000, makeLine({ sharePct: null }))).toBeNull()
  })

  it('returns null when sharePct is 0', () => {
    expect(calculateLine(1000, makeLine({ sharePct: 0 }))).toBeNull()
  })

  it('returns null when sharePct is negative', () => {
    expect(calculateLine(1000, makeLine({ sharePct: -1 }))).toBeNull()
  })
})

describe('calculateLine — supplierNote', () => {
  it('tank-staves lines have a non-null supplierNote', () => {
    const result = calculateLine(1000, makeLine({ format: 'tank-staves', sharePct: 100 }))
    expect(result?.supplierNote).not.toBeNull()
    expect(typeof result?.supplierNote).toBe('string')
  })

  it('chips lines have null supplierNote', () => {
    const result = calculateLine(1000, makeLine({ format: 'chips', sharePct: 100 }))
    expect(result?.supplierNote).toBeNull()
  })

  it('mini-staves lines have null supplierNote', () => {
    const result = calculateLine(1000, makeLine({ format: 'mini-staves', sharePct: 100 }))
    expect(result?.supplierNote).toBeNull()
  })
})

// ─── deriveWorksheet ──────────────────────────────────────────────────────────

describe('deriveWorksheet — shareTotal states', () => {
  it('incomplete when shareTotal < 100', () => {
    const result = deriveWorksheet(makeHeader(1000, 50), [makeLine({ sharePct: 60 })])
    expect(result.shareTotalState).toBe('incomplete')
    expect(result.shareTotal).toBe(60)
  })

  it('valid when shareTotal === 100', () => {
    const result = deriveWorksheet(makeHeader(1000, 50), [makeLine({ sharePct: 100 })])
    expect(result.shareTotalState).toBe('valid')
    expect(result.shareTotal).toBe(100)
  })

  it('over when shareTotal > 100', () => {
    const lines = [makeLine({ id: 'a', sharePct: 60 }), makeLine({ id: 'b', sharePct: 60 })]
    const result = deriveWorksheet(makeHeader(1000, 50), lines)
    expect(result.shareTotalState).toBe('over')
    expect(result.shareTotal).toBe(120)
  })
})

describe('deriveWorksheet — canDisplay gating', () => {
  it('canDisplay is false when shareTotal < 100', () => {
    const result = deriveWorksheet(makeHeader(1000, 50), [makeLine({ sharePct: 50 })])
    expect(result.canDisplay).toBe(false)
    expect(result.lineResults).toEqual([])
  })

  it('canDisplay is false when shareTotal > 100', () => {
    const lines = [makeLine({ id: 'a', sharePct: 60 }), makeLine({ id: 'b', sharePct: 60 })]
    const result = deriveWorksheet(makeHeader(1000, 50), lines)
    expect(result.canDisplay).toBe(false)
    expect(result.lineResults).toEqual([])
  })

  it('canDisplay is false when volumeGallons is null', () => {
    const result = deriveWorksheet(makeHeader(null, 50), [makeLine({ sharePct: 100 })])
    expect(result.canDisplay).toBe(false)
    expect(result.gallonsToTreat).toBeNull()
  })

  it('canDisplay is false when targetPct is null', () => {
    const result = deriveWorksheet(makeHeader(1000, null), [makeLine({ sharePct: 100 })])
    expect(result.canDisplay).toBe(false)
  })

  it('canDisplay is true when header valid and shareTotal === 100', () => {
    const result = deriveWorksheet(makeHeader(1000, 50), [makeLine({ sharePct: 100 })])
    expect(result.canDisplay).toBe(true)
    expect(result.lineResults).toHaveLength(1)
  })
})

describe('deriveWorksheet — canPrint gating', () => {
  it('canPrint is false when varietal is empty even if canDisplay is true', () => {
    const header = { volumeGallons: 1000, targetPct: 50, varietal: '' }
    const result = deriveWorksheet(header, [makeLine({ sharePct: 100 })])
    expect(result.canDisplay).toBe(true)
    expect(result.canPrint).toBe(false)
  })

  it('canPrint is false when any line supplier is empty', () => {
    const result = deriveWorksheet(
      makeHeader(1000, 50),
      [makeLine({ sharePct: 100, supplier: '' })],
    )
    expect(result.canPrint).toBe(false)
  })

  it('canPrint is true when all required fields are filled', () => {
    const result = deriveWorksheet(makeHeader(1000, 50), [makeLine({ sharePct: 100 })])
    expect(result.canPrint).toBe(true)
  })

  it('canPrint is false when a line has null sharePct even if shareTotal === 100', () => {
    // Line 2 contributes 0 via ?? 0, so shareTotal = 100 and canDisplay is true —
    // but the null-share line has no dose and must not reach the printed work order.
    const lines = [makeLine({ id: 'a', sharePct: 100 }), makeLine({ id: 'b', sharePct: null })]
    const result = deriveWorksheet(makeHeader(1000, 50), lines)
    expect(result.canDisplay).toBe(true)
    expect(result.canPrint).toBe(false)
  })

  it('canPrint is false when a line has sharePct 0 even if shareTotal === 100', () => {
    const lines = [makeLine({ id: 'a', sharePct: 100 }), makeLine({ id: 'b', sharePct: 0 })]
    const result = deriveWorksheet(makeHeader(1000, 50), lines)
    expect(result.canDisplay).toBe(true)
    expect(result.canPrint).toBe(false)
  })
})

describe('deriveWorksheet — null-filtering from lineResults', () => {
  it('omits null calculateLine results from lineResults', () => {
    const lines = [
      makeLine({ id: 'a', format: null, sharePct: 50 }),
      makeLine({ id: 'b', format: 'chips', sharePct: 50 }),
    ]
    const result = deriveWorksheet(makeHeader(1000, 50), lines)
    expect(result.canDisplay).toBe(true)
    expect(result.lineResults).toHaveLength(1)
    expect(result.lineResults[0]?.lineId).toBe('b')
  })
})

describe('deriveWorksheet — formula correctness (quickstart Scenario 1)', () => {
  it('2,000 gal / 50% target / chips / 100% share → 25 lbs', () => {
    const header = makeHeader(2000, 50)
    const line = makeLine({ format: 'chips', sharePct: 100 })
    const derived = deriveWorksheet(header, [line])
    expect(derived.gallonsToTreat).toBe(1000)
    expect(derived.lineResults[0]?.quantity).toBe(25)
  })
})
