export const CANONICAL_TABLES = {
  user: 'profiles',
  provider: 'obrtnik_profiles',
} as const

export const LEGACY_TABLES = {
  user: 'user',
  provider: 'craftworker_profile',
  partners: 'partners',
  allProvidersView: 'all_obrtniki',
} as const

export type CanonicalRole = 'narocnik' | 'obrtnik'
export type LegacyRole = 'CUSTOMER' | 'CRAFTWORKER'

const CANONICAL_TO_LEGACY_ROLE: Record<CanonicalRole, LegacyRole> = {
  narocnik: 'CUSTOMER',
  obrtnik: 'CRAFTWORKER',
}

const LEGACY_TO_CANONICAL_ROLE: Record<LegacyRole, CanonicalRole> = {
  CUSTOMER: 'narocnik',
  CRAFTWORKER: 'obrtnik',
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
  if (!role) return null
  if (role === 'narocnik' || role === 'obrtnik') return role
  if (role === 'CUSTOMER' || role === 'CRAFTWORKER') {
    return LEGACY_TO_CANONICAL_ROLE[role]
  }
  return null
}

export function toLegacyRole(role: string | null | undefined): LegacyRole | null {
  if (!role) return null
  if (role === 'CUSTOMER' || role === 'CRAFTWORKER') return role
  if (role === 'narocnik' || role === 'obrtnik') {
    return CANONICAL_TO_LEGACY_ROLE[role]
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
