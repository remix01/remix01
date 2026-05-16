import { normalizeActorRole, type CanonicalActorRole } from '@/lib/domain/canonical-mapping'

export const CANONICAL_TABLES = {
  user: 'profiles',
  provider: 'obrtnik_profiles',
} as const

export type CanonicalRole = CanonicalActorRole
export type LegacyRole = 'CUSTOMER' | 'CRAFTWORKER'

const CANONICAL_TO_LEGACY_ROLE: Record<'customer' | 'provider', LegacyRole> = {
  customer: 'CUSTOMER',
  provider: 'CRAFTWORKER',
}

export const CANONICAL_PROVIDER_RELATIONSHIP = {
  userTable: CANONICAL_TABLES.user,
  providerTable: CANONICAL_TABLES.provider,
  key: 'id',
  invariant: 'profiles.id = obrtnik_profiles.id',
} as const

export function isCanonicalUserTable(tableName: string): boolean {
  return tableName === CANONICAL_TABLES.user
}

export function isCanonicalProviderTable(tableName: string): boolean {
  return tableName === CANONICAL_TABLES.provider
}

export function toCanonicalRole(role: string | null | undefined): CanonicalRole | null {
  return normalizeActorRole(role)
}

export function toLegacyRole(role: string | null | undefined): LegacyRole | null {
  const canonical = normalizeActorRole(role)
  if (!canonical) return null
  if (canonical === 'customer' || canonical === 'provider') {
    return CANONICAL_TO_LEGACY_ROLE[canonical]
  }
  return null
}

export interface CanonicalProviderShape {
  id: string
}

export function assertCanonicalProviderShape(
  record: unknown
): record is CanonicalProviderShape {
  if (!record || typeof record !== 'object') return false
  const candidate = record as Record<string, unknown>
  return typeof candidate.id === 'string' && candidate.id.length > 0
}
