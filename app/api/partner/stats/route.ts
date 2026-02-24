import { getPartner, getPartnerStats } from '@/lib/supabase-partner'
import { NextResponse } from 'next/server'

/**
 * GET — partner's personal KPI stats
 */
export async function GET() {
  const partner = await getPartner()
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stats = await getPartnerStats(partner.id)
  
  return NextResponse.json({
    ...stats,
    paket: partner.partner_paketi?.[0]?.paket ?? 'start',
  })
}
