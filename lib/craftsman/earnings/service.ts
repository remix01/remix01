import type { SupabaseClient } from '@supabase/supabase-js'
import type { EarningsPayoutDto, EarningsResponseDto } from './types'

interface PartnerRow {
  id: string
  stripe_account_id: string | null
  subscription_tier: string | null
}

interface PayoutRow {
  id: string
  created_at: string
  amount_eur: number | string | null
  ponudba_id: string | null
}

interface AcceptedOfferRow {
  id: string
  price_estimate: number | string | null
}

export class EarningsServiceError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'EarningsServiceError'
    this.code = code
    this.status = status
  }
}

function toPayoutDto(row: PayoutRow): EarningsPayoutDto {
  const amount = Number(row.amount_eur) || 0
  return {
    id: row.id,
    created_at: row.created_at,
    amount,
    amount_eur: amount,
    ponudba_id: row.ponudba_id ?? null,
  }
}

export const earningsService = {
  async getCraftsmanEarnings(supabase: SupabaseClient, userId: string): Promise<EarningsResponseDto> {
    const { data: partner, error: partnerError } = await supabase
      .from('obrtnik_profiles')
      .select('id, stripe_account_id, subscription_tier')
      .eq('id', userId)
      .maybeSingle<PartnerRow>()

    if (partnerError || !partner) {
      throw new EarningsServiceError('PARTNER_NOT_FOUND', 'Partner not found', 404)
    }

    const { data: payouts, error: payoutsError } = await supabase
      .from('payouts')
      .select('id, created_at, amount_eur, ponudba_id')
      .eq('obrtnik_id', partner.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .returns<PayoutRow[]>()

    if (payoutsError) {
      throw new EarningsServiceError('PAYOUTS_FETCH_FAILED', 'Failed to fetch payouts', 500)
    }

    const payoutList = (payouts ?? []).map(toPayoutDto)

    const totalEarnings = payoutList.reduce((sum, p) => sum + p.amount, 0)

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthEarnings = payoutList
      .filter((p) => new Date(p.created_at) >= firstDayOfMonth)
      .reduce((sum, p) => sum + p.amount, 0)

    const { count: paidOrdersCount, error: paidOrdersError } = await supabase
      .from('ponudbe')
      .select('*', { count: 'exact', head: true })
      .eq('obrtnik_id', partner.id)
      .eq('status', 'sprejeta')

    if (paidOrdersError) {
      throw new EarningsServiceError('PAID_ORDERS_FETCH_FAILED', 'Failed to fetch paid orders', 500)
    }

    const { data: acceptedPonudbe, error: acceptedError } = await supabase
      .from('ponudbe')
      .select('id, price_estimate')
      .eq('obrtnik_id', partner.id)
      .eq('status', 'sprejeta')
      .returns<AcceptedOfferRow[]>()

    if (acceptedError) {
      throw new EarningsServiceError('ACCEPTED_OFFERS_FETCH_FAILED', 'Failed to fetch accepted offers', 500)
    }

    const acceptedIds = (acceptedPonudbe ?? []).map((o) => o.id)
    const paidOutIds = payoutList.map((p) => p.ponudba_id).filter((id): id is string => Boolean(id))
    const pendingIds = acceptedIds.filter((id) => !paidOutIds.includes(id))

    const pendingPayouts = (acceptedPonudbe ?? [])
      .filter((o) => pendingIds.includes(o.id))
      .reduce((sum, o) => sum + (Number(o.price_estimate) || 0), 0)

    return {
      stripeAccountId: partner.stripe_account_id,
      stripeOnboardingComplete: false,
      subscriptionPlan: partner.subscription_tier || 'start',
      statistics: {
        thisMonthEarnings,
        totalEarnings,
        paidOrdersCount: paidOrdersCount || 0,
        pendingPayouts,
      },
      recentPayouts: payoutList,
    }
  },
}
