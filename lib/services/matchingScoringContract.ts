export type ScoringPipelineVersion =
  | 'classic-v1'
  | 'smart-v3-production'

export interface ScoringInput {
  requestId: string
  categoryId: string
  lat?: number
  lng?: number
  locationCity?: string
  locationRegion?: string
}

export interface ScoringCandidate {
  id: string
  available?: boolean
  city?: string | null
  region?: string | null
  categoryIds?: string[]
  rating?: number
  responseTimeHours?: number | null
  isOnline?: boolean
  subscriptionTier?: string | null
  distanceKm?: number
  metadata?: Record<string, unknown>
}

export interface ScoringReason {
  code: string
  message: string
  impact: number
}

export interface ScoringResult {
  candidateId: string
  score: number
  rank: number
  selected: boolean
  reasons: ScoringReason[]
  pipelineVersion: ScoringPipelineVersion
}

export interface ScoringAudit {
  selectedCandidateId: string | null
  score: number | null
  mainReasons: string[]
  pipelineVersion: ScoringPipelineVersion
}

export function buildScoringAudit(results: ScoringResult[]): ScoringAudit {
  const selected = results.find((r) => r.selected) ?? null

  return {
    selectedCandidateId: selected?.candidateId ?? null,
    score: selected?.score ?? null,
    mainReasons: selected ? selected.reasons.slice(0, 3).map((r) => r.message) : [],
    pipelineVersion: selected?.pipelineVersion ?? (results[0]?.pipelineVersion ?? 'classic-v1'),
  }
}
