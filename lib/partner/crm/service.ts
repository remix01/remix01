import type { SupabaseClient } from '@supabase/supabase-js'
import { canAccessFeature } from '@/lib/access-policy'
import { toCRMData } from './adapter'
import type { CRMData } from './types'

export class PartnerCRMServiceError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'PartnerCRMServiceError'
    this.code = code
    this.status = status
  }
}

function currentMonthStartISO() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

export const partnerCRMService = {
  async getCRMData(supabase: SupabaseClient, userId: string): Promise<CRMData> {
    const { data: profile, error: profileError } = await supabase
      .from('obrtnik_profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      throw new PartnerCRMServiceError('PROFILE_READ_FAILED', profileError.message, 500)
    }

    const featureAccess = canAccessFeature(profile?.subscription_tier, 'crm')
    if (!featureAccess.allowed) {
      throw new PartnerCRMServiceError('TIER_REQUIRED', 'PRO paket obvezen.', 403)
    }

    const monthStart = currentMonthStartISO()

    const [monthOffersResult, recentOffersResult, escrowResult] = await Promise.all([
      supabase
        .from('ponudbe')
        .select('id, title, status, price_estimate, created_at, povprasevanje_id')
        .eq('obrtnik_id', userId)
        .gte('created_at', monthStart),
      supabase
        .from('ponudbe')
        .select('id, title, status, price_estimate, created_at, povprasevanje_id')
        .eq('obrtnik_id', userId)
        .order('created_at', { ascending: false })
        .limit(40),
      supabase
        .from('escrow_transactions')
        .select('amount_cents')
        .eq('partner_id', userId)
        .gte('created_at', monthStart),
    ])

    if (monthOffersResult.error) {
      throw new PartnerCRMServiceError('CRM_MONTH_OFFERS_FAILED', monthOffersResult.error.message, 500)
    }
    if (recentOffersResult.error) {
      throw new PartnerCRMServiceError('CRM_RECENT_OFFERS_FAILED', recentOffersResult.error.message, 500)
    }
    if (escrowResult.error) {
      throw new PartnerCRMServiceError('CRM_ESCROW_FAILED', escrowResult.error.message, 500)
    }

    return toCRMData(monthOffersResult.data ?? [], recentOffersResult.data ?? [], escrowResult.data ?? [])
  },
}
