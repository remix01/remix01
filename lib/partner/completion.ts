/**
 * Partner onboarding completion tracker.
 * Used by the partner dashboard to show the setup checklist.
 */
import { createClient } from '@/lib/supabase/client'

export interface CompletionStatus {
  hasDescription: boolean
  hasHourlyRate: boolean
  hasPhone: boolean
  hasOffers: boolean
  completionPercentage: number
}

/**
 * Fetches the onboarding completion status for a partner.
 * Checks: business description, hourly rate, phone number, and at least one offer.
 *
 * Pass precomputedOfferCount when the caller already has the offer count to avoid
 * a redundant ponudbe query.
 */
export async function getCompletionStatus(
  partnerId: string,
  precomputedOfferCount?: number
): Promise<CompletionStatus> {
  const supabase = createClient()

  const [obrtnikRes, userProfileRes, offersRes] = await Promise.all([
    supabase
      .from('obrtnik_profiles')
      .select('description, hourly_rate')
      .eq('id', partnerId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('phone')
      .eq('id', partnerId)
      .maybeSingle(),
    precomputedOfferCount !== undefined
      ? Promise.resolve(null)
      : supabase
          .from('ponudbe')
          .select('id', { count: 'exact', head: true })
          .eq('obrtnik_id', partnerId),
  ])

  const profile = obrtnikRes.data
  const userProfile = userProfileRes.data
  const hasDescription = !!(profile?.description && profile.description.trim().length > 0)
  const hasHourlyRate = !!(profile?.hourly_rate && profile.hourly_rate > 0)
  const hasPhone = !!(userProfile?.phone && userProfile.phone.trim().length > 0)
  const hasOffers =
    precomputedOfferCount !== undefined
      ? precomputedOfferCount > 0
      : (offersRes?.count ?? 0) > 0

  const checks = [hasDescription, hasHourlyRate, hasPhone, hasOffers]
  const completionPercentage = (checks.filter(Boolean).length / checks.length) * 100

  return {
    hasDescription,
    hasHourlyRate,
    hasPhone,
    hasOffers,
    completionPercentage,
  }
}
