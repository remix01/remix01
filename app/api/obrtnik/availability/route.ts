/**
 * POST /api/obrtnik/availability
 *
 * Contractor sets their real-time status:
 *   online  — logged in, actively watching for leads
 *   offline — not available right now
 *   busy    — working, don't send new leads
 *
 * Body: { status: 'online' | 'offline' | 'busy' }
 *
 * Updates: is_online, is_busy, last_seen_at on obrtnik_profiles.
 * Also adjusts max_active_leads based on subscription tier if not already set.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['online', 'offline', 'busy'] as const
type AvailabilityStatus = typeof VALID_STATUSES[number]

const TIER_MAX_LEADS: Record<string, number> = {
  start: 3,
  pro: 10,
  elite: 20,
  enterprise: 50,
}

export async function POST(req: NextRequest) {
  try {
    // Auth
    const userClient = await createClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate body
    const body = await req.json().catch(() => null)
    const status = body?.status as AvailabilityStatus | undefined
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: online | offline | busy' },
        { status: 400 }
      )
    }
    const isOnline = status === 'online'
    const isBusy = status === 'busy'

    const supabase = createAdminClient()

    // Check profile exists + get tier
    const { data: obrtnik, error: profileError } = await supabase
      .from('obrtnik_profiles')
      .select('id, max_active_leads')
      .eq('id', user.id)
      .single()

    if (profileError || !obrtnik) {
      return NextResponse.json({ error: 'Profil obrtnika ne obstaja' }, { status: 404 })
    }

    // Get subscription tier to set appropriate max_active_leads
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    const tier = (profile?.subscription_tier as string) || 'start'
    const maxLeads = TIER_MAX_LEADS[tier.toLowerCase()] ?? 3

    // Update availability (cast needed until generated types are regenerated)
    const availabilityUpdate = {
      is_online: isOnline,
      is_busy: isBusy,
      last_seen_at: new Date().toISOString(),
      max_active_leads: maxLeads,
    } as Record<string, unknown>

    const { error: updateError } = await supabase
      .from('obrtnik_profiles')
      .update(availabilityUpdate as any)
      .eq('id', user.id)

    if (updateError) {
      console.error('[Availability] Update error:', updateError.message)
      return NextResponse.json({ error: 'Posodobitev ni uspela' }, { status: 500 })
    }

    console.log(JSON.stringify({
      level: 'info',
      event: 'obrtnik_availability_changed',
      obrtnikId: user.id,
      status,
      tier,
      maxLeads,
    }))

    return NextResponse.json({
      success: true,
      status,
      is_online: isOnline,
      is_busy: isBusy,
      max_active_leads: maxLeads,
    })
  } catch (error) {
    console.error('[Availability] Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userClient = await createClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { data: rawData, error } = await (supabase as any)
      .from('obrtnik_profiles')
      .select('is_online, is_busy, last_seen_at, max_active_leads, active_lead_count, service_radius_km')
      .eq('id', user.id)
      .single()

    if (error || !rawData) {
      return NextResponse.json({ error: 'Profil ne obstaja' }, { status: 404 })
    }

    const data = rawData as {
      is_online: boolean
      is_busy: boolean
      last_seen_at: string | null
      max_active_leads: number
      active_lead_count: number
      service_radius_km: number
    }

    return NextResponse.json({
      is_online: data.is_online,
      is_busy: data.is_busy,
      last_seen_at: data.last_seen_at,
      max_active_leads: data.max_active_leads,
      active_lead_count: data.active_lead_count,
      service_radius_km: data.service_radius_km,
      status: data.is_busy ? 'busy' : data.is_online ? 'online' : 'offline',
    })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
