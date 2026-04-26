import { getAuthenticatedPartner } from '@/lib/partner/resolver'
import { canonicalPartnerService } from '@/lib/partner/service'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

/**
 * GET — partner profile (dual-read: obrtnik_profiles first, fallback partners)
 */
export async function GET() {
  const partner = await getAuthenticatedPartner()
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    ...partner.profile,
    user_id: partner.userId,
    partner_id: partner.partnerId,
  })
}

/**
 * PATCH — update partner profile (single-write canonical: obrtnik_profiles only)
 */
export async function PATCH(req: Request) {
  const partner = await getAuthenticatedPartner()
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowed = [
    // legacy field names (mapped internally)
    'bio', 'podjetje', 'leta_izkusenj',
    // canonical field names
    'description', 'business_name', 'years_experience',
    'hourly_rate', 'tagline', 'website_url', 'facebook_url',
    'instagram_url', 'service_radius_km',
  ]

  const filtered: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) filtered[key] = body[key]
  }

  try {
    const data = await canonicalPartnerService.updateProfile(partner.partnerId, filtered)
    return NextResponse.json({
      ...data,
      user_id: partner.userId,
      partner_id: partner.partnerId,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Update failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
