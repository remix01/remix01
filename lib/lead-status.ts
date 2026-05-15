export const CANONICAL_LEAD_STATUSES = [
  'new',
  'matched',
  'contacted',
  'in_progress',
  'completed',
  'cancelled',
  'expired',
] as const

export type CanonicalLeadStatus = (typeof CANONICAL_LEAD_STATUSES)[number]

const LEGACY_TO_CANONICAL_STATUS: Record<string, CanonicalLeadStatus> = {
  new: 'new',
  matched: 'matched',
  contacted: 'contacted',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
  expired: 'expired',

  odprto: 'new',
  v_teku: 'in_progress',
  zakljuceno: 'completed',
  zaključeno: 'completed',
  preklicano: 'cancelled',

  open: 'new',
  opened: 'new',
  accepted: 'contacted',
  quoted: 'contacted',
}

const STATUS_LABELS_SL: Record<CanonicalLeadStatus, string> = {
  new: 'Odprto',
  matched: 'Ujemanje',
  contacted: 'Kontaktirano',
  in_progress: 'V teku',
  completed: 'Zaključeno',
  cancelled: 'Preklicano',
  expired: 'Poteklo',
}

export function toCanonicalLeadStatus(rawStatus: string | null | undefined): CanonicalLeadStatus {
  const normalized = (rawStatus || '').trim().toLowerCase()
  return LEGACY_TO_CANONICAL_STATUS[normalized] ?? 'new'
}

export function toLegacyInquiryStatus(status: CanonicalLeadStatus): 'odprto' | 'v_teku' | 'zakljuceno' | 'preklicano' {
  switch (status) {
    case 'new':
    case 'matched':
      return 'odprto'
    case 'contacted':
    case 'in_progress':
      return 'v_teku'
    case 'completed':
      return 'zakljuceno'
    case 'cancelled':
    case 'expired':
      return 'preklicano'
  }
}

export function getLeadStatusLabelSl(status: CanonicalLeadStatus): string {
  return STATUS_LABELS_SL[status]
}

export function isCanonicalLeadStatus(value: string): value is CanonicalLeadStatus {
  return (CANONICAL_LEAD_STATUSES as readonly string[]).includes(value)
}
