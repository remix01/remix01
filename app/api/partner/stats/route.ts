import { getAuthenticatedPartner } from '@/lib/partner/resolver'
import { canonicalPartnerService } from '@/lib/partner/service'
import { NextResponse } from 'next/server'

/**
 * GET — partner's personal KPI stats (canonical: obrtnik_id queries)
 */
export async function GET() {
  const partner = await getAuthenticatedPartner()
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stats = await canonicalPartnerService.getStats(partner.partnerId)

  return NextResponse.json({
    ...stats,
    paket: partner.profile.subscription_tier ?? 'start',
  })
}
