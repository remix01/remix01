export interface EarningsStatisticsDto {
  thisMonthEarnings: number
  totalEarnings: number
  paidOrdersCount: number
  pendingPayouts: number
}

export interface EarningsPayoutDto {
  id: string
  created_at: string
  amount: number
  amount_eur: number
  ponudba_id: string | null
}

export interface EarningsResponseDto {
  stripeAccountId: string | null
  stripeOnboardingComplete: boolean
  subscriptionPlan: string
  statistics: EarningsStatisticsDto
  recentPayouts: EarningsPayoutDto[]
}
