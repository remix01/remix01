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
 */
export async function getCompletionStatus(
  partnerId: string
): Promise<CompletionStatus> {
  const supabase = createClient()

  const [profileRes, offersRes] = await Promise.all([
    supabase
      .from('obrtnik_profiles')
      .select('description, hourly_rate, phone')
      .eq('id', partnerId)
      .maybeSingle(),
    supabase
      .from('ponudbe')
      .select('id', { count: 'exact', head: true })
      .eq('obrtnik_id', partnerId),
  ])

  const profile = profileRes.data
  const hasDescription = !!(profile?.description && profile.description.trim().length > 0)
  const hasHourlyRate = !!(profile?.hourly_rate && profile.hourly_rate > 0)
  const hasPhone = !!(profile?.phone && profile.phone.trim().length > 0)
  const hasOffers = (offersRes.count ?? 0) > 0

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
