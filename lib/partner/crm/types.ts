export interface CRMStats {
  offersThisMonth: number
  acceptedThisMonth: number
  conversionRate: number
  revenueThisMonth: number
}

export interface CRMPipelineItem {
  id: string
  title: string | null
  price_estimate: number | null
  created_at: string
  povprasevanje_id: string | null
}

export interface CRMPipelineStage {
  stage: 'poslana' | 'sprejeta' | 'zavrnjena'
  count: number
  offers: CRMPipelineItem[]
}

export interface CRMActivityItem {
  id: string
  type: string
  description: string
  amount: number | null
  timestamp: string
}

export interface CRMData {
  stats: CRMStats
  pipeline: CRMPipelineStage[]
  recentActivity: CRMActivityItem[]
}

export const CRM_PIPELINE_STAGES: CRMPipelineStage['stage'][] = [
  'poslana',
  'sprejeta',
  'zavrnjena',
]
