export const CANONICAL_LEAD_STATUSES = [
  'new',
  'qualified',
  'matched',
  'quoted',
  'accepted',
  'in_progress',
  'completed',
  'cancelled',
  'rejected',
] as const

export const CANONICAL_PAYMENT_STATUSES = [
  'pending',
  'captured',
  'released',
  'refunded',
  'disputed',
  'failed',
  'cancelled',
] as const

export const CANONICAL_ACTOR_ROLES = ['customer', 'provider', 'admin', 'system'] as const

export type CanonicalLeadStatus = (typeof CANONICAL_LEAD_STATUSES)[number]
export type CanonicalPaymentStatus = (typeof CANONICAL_PAYMENT_STATUSES)[number]
export type CanonicalActorRole = (typeof CANONICAL_ACTOR_ROLES)[number]

const LEAD_STATUS_MAP: Record<string, CanonicalLeadStatus> = {
  new: 'new',
  qualified: 'qualified',
  matched: 'matched',
  quoted: 'quoted',
  accepted: 'accepted',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
  rejected: 'rejected',
  novo: 'new',
  odprto: 'new',
  dodeljeno: 'matched',
  v_teku: 'in_progress',
  zaključeno: 'completed',
}

const PAYMENT_STATUS_MAP: Record<string, CanonicalPaymentStatus> = {
  pending: 'pending',
  captured: 'captured',
  released: 'released',
  refunded: 'refunded',
  disputed: 'disputed',
  failed: 'failed',
  cancelled: 'cancelled',
  unpaid: 'pending',
  held: 'captured',
}

const ACTOR_ROLE_MAP: Record<string, CanonicalActorRole> = {
  customer: 'customer',
  provider: 'provider',
  admin: 'admin',
  system: 'system',
  narocnik: 'customer',
  obrtnik: 'provider',
  craftworker: 'provider',
}

export function normalizeLeadStatus(raw: string | null | undefined): CanonicalLeadStatus {
  const key = (raw ?? '').trim().toLowerCase()
  return LEAD_STATUS_MAP[key] ?? 'new'
}

export function normalizePaymentStatus(raw: string | null | undefined): CanonicalPaymentStatus {
  const key = (raw ?? '').trim().toLowerCase()
  return PAYMENT_STATUS_MAP[key] ?? 'pending'
}

export function normalizeActorRole(raw: string | null | undefined): CanonicalActorRole | null {
  const key = (raw ?? '').trim().toLowerCase()
  return ACTOR_ROLE_MAP[key] ?? null
}
