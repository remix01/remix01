import { getPartner, getPartnerStats } from '@/lib/supabase-partner'
import { ok, fail } from '@/lib/http/response'

/**
 * GET — partner's personal KPI stats
 */
export async function GET() {
  const partner = await getPartner()
  if (!partner) return fail('Unauthorized', 401)

  const stats = await getPartnerStats(partner.id)
  
  return ok({
    ...stats,
    paket: partner.partner_paketi?.[0]?.paket ?? 'start',
  })
}
