import { getAuthenticatedPartner } from '@/lib/partner/resolver'
import { ok, fail } from '@/lib/api/response'
import { supabaseAdmin } from '@/lib/supabase-admin'

const OFFER_SELECT =
  'id, povprasevanje_id, obrtnik_id, title, message, description, notes, price_estimate, price_type, status, available_date, created_at'

export async function GET() {
  const partner = await getAuthenticatedPartner()
  if (!partner) return fail('UNAUTHORIZED', 'Unauthorized', 401)

  const { partnerId, userId, profile } = partner

  const [offersRes, openCountRes, phoneRes] = await Promise.all([
    supabaseAdmin
      .from('ponudbe')
      .select(OFFER_SELECT)
      .eq('obrtnik_id', partnerId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('povprasevanja')
      .select('id', { count: 'exact', head: true })
      .in('status', ['odprto', 'new']),
    supabaseAdmin
      .from('profiles')
      .select('phone')
      .eq('id', userId)
      .maybeSingle(),
  ])

  const offers = offersRes.data ?? []
  const openRequestsCount = openCountRes.count ?? 0
  const phone = phoneRes.data?.phone ?? null

  const hasDescription =
    typeof profile.description === 'string' && profile.description.trim().length > 0
  const hasHourlyRate = profile.hourly_rate != null
  const hasPhone = typeof phone === 'string' && phone.trim().length > 0
  const hasOffers = offers.length > 0
  const completionPercentage =
    ([hasDescription, hasHourlyRate, hasPhone, hasOffers].filter(Boolean).length / 4) * 100

  return ok({
    partner: {
      id: profile.id,
      business_name: profile.business_name,
      subscription_tier: profile.subscription_tier,
      is_verified: profile.is_verified,
      description: profile.description,
      hourly_rate: profile.hourly_rate,
    },
    offers,
    openRequestsCount,
    completionStatus: {
      completionPercentage,
      hasDescription,
      hasHourlyRate,
      hasPhone,
      hasOffers,
    },
  })
}
