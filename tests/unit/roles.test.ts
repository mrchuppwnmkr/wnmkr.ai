import { describe, it, expect } from 'vitest'
import { TIERS, meetsTier, toTier, toRole, tierFromRole, recomputeEntitlement } from '@/lib/auth/roles'

describe('tier ordering', () => {
  const rank = { free: 0, vintner: 1, winemaker: 2, cellar_master: 3 } as const

  it('admits equal or higher tiers and refuses lower ones, for every pair', () => {
    for (const actual of TIERS) {
      for (const required of TIERS) {
        expect(meetsTier(actual, required)).toBe(rank[actual] >= rank[required])
      }
    }
  })
})

describe('untrusted coercion', () => {
  it('resolves an unrecognised tier to free rather than passing', () => {
    expect(toTier('cellar_masterr')).toBe('free')
    expect(toTier(undefined)).toBe('free')
    expect(toTier(null)).toBe('free')
    expect(toTier({ tier: 'admin' })).toBe('free')
    // The important consequence: a garbage claim cannot open a gated page.
    expect(meetsTier(toTier('anything'), 'vintner')).toBe(false)
  })

  it('resolves an unrecognised role to registered', () => {
    expect(toRole('superuser')).toBe('registered')
    expect(toRole(42)).toBe('registered')
  })
})

describe('tierFromRole', () => {
  it('maps paid roles to their tier and everything else to free', () => {
    expect(tierFromRole('vintner')).toBe('vintner')
    expect(tierFromRole('winemaker')).toBe('winemaker')
    expect(tierFromRole('cellar_master')).toBe('cellar_master')
    expect(tierFromRole('registered')).toBe('free')
    // Founder tier is set explicitly at grant time, never derived.
    expect(tierFromRole('founder')).toBe('free')
  })
})

describe('recomputeEntitlement', () => {
  it('returns the free baseline in Phase 1, since no subscription can exist yet', () => {
    expect(recomputeEntitlement('user_abc')).toEqual({
      role: 'registered',
      tier: 'free',
      source: 'none',
    })
  })
})
