/**
 * The role and entitlement vocabulary. Single source of truth for both the database enums and the
 * guard. See specs/001-auth-user-model/data-model.md.
 */

export const ROLES = [
  'registered',
  'vintner',
  'winemaker',
  'cellar_master',
  'founder',
  'admin',
] as const
export type Role = (typeof ROLES)[number]

/**
 * `anonymous` is deliberately absent. It is the absence of an authenticated identity (FR-008), not
 * a stored value — encoding it would create a row that could be granted access.
 */

export const TIERS = ['free', 'vintner', 'winemaker', 'cellar_master'] as const
export type Tier = (typeof TIERS)[number]

export type EntitlementSource = 'none' | 'subscription' | 'founder_grant'

/** Ordinal position, so `minTier` admits all higher tiers without enumerating them. */
const TIER_RANK: Record<Tier, number> = {
  free: 0,
  vintner: 1,
  winemaker: 2,
  cellar_master: 3,
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

export function isTier(value: unknown): value is Tier {
  return typeof value === 'string' && (TIERS as readonly string[]).includes(value)
}

/**
 * Coerce an untrusted value to a Tier. An unrecognised value resolves to `free` — never to a pass.
 * Constitution Principle III: deny by default.
 */
export function toTier(value: unknown): Tier {
  return isTier(value) ? value : 'free'
}

export function toRole(value: unknown): Role {
  return isRole(value) ? value : 'registered'
}

export function meetsTier(actual: Tier, required: Tier): boolean {
  return TIER_RANK[actual] >= TIER_RANK[required]
}

/** The tier a paid role confers. Founder tier is set explicitly and is not derived here. */
export function tierFromRole(role: Role): Tier {
  switch (role) {
    case 'vintner':
      return 'vintner'
    case 'winemaker':
      return 'winemaker'
    case 'cellar_master':
      return 'cellar_master'
    default:
      return 'free'
  }
}

export type Entitlement = { role: Role; tier: Tier; source: EntitlementSource }

/**
 * What a user is entitled to once a Founder grant is removed.
 *
 * In Phase 1 there are no subscriptions, so this always resolves to the free baseline. It exists
 * as a function rather than a literal reset so the Stripe slice changes this one body instead of
 * every revocation call site (FR-021, data-model.md).
 */
export function recomputeEntitlement(_clerkUserId: string): Entitlement {
  return { role: 'registered', tier: 'free', source: 'none' }
}
