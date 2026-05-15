import { getReadinessReport } from '@/lib/env'

export type CheckStatus = 'ok' | 'missing'

export interface IntegrationReadiness {
  status: CheckStatus
  configured: string[]
  missing: string[]
}

export function getConfigReadiness() {
  return getReadinessReport()
}
