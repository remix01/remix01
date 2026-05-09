import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdmin, logAction } from '@/lib/supabase-admin'

/**
 * POST /api/admin/leads/auto-process
 *
 * Auto-approves leads that meet quality criteria:
 * - business_name length >= 3
 * - profile has location_city
 * - description is non-empty
 *
 * Optional body: { dryRun: true } to preview without committing.
 */
export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const dryRun = body?.dryRun === true

  // Fetch all pending leads with their profile
  const { data: leads, error } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('id, business_name, description, profile:profiles!id(location_city)')
    .eq('profile_status', 'lead')
    .eq('is_verified', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!leads || leads.length === 0) {
    return NextResponse.json({ ok: true, eligible: 0, approved: 0, dryRun })
  }

  const eligible = leads.filter((l) => {
    const profile = Array.isArray(l.profile) ? l.profile[0] : l.profile
    return (
      l.business_name?.trim().length >= 3 &&
      profile?.location_city?.trim() &&
      l.description?.trim().length > 5
    )
  })

  if (dryRun) {
    return NextResponse.json({ ok: true, eligible: eligible.length, approved: 0, dryRun: true, preview: eligible.map((l) => l.id) })
  }

  if (eligible.length === 0) {
    return NextResponse.json({ ok: true, eligible: 0, approved: 0, dryRun: false })
  }

  const ids = eligible.map((l) => l.id)
  const { error: updateError } = await supabaseAdmin
    .from('obrtnik_profiles')
    .update({ profile_status: 'active', is_verified: true })
    .in('id', ids)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await logAction(admin.id, 'AUTO_APPROVE_LEADS', 'obrtnik_profiles', ids.join(','), { profile_status: 'lead' }, { profile_status: 'active', is_verified: true })

  return NextResponse.json({ ok: true, eligible: eligible.length, approved: eligible.length, dryRun: false })
}
