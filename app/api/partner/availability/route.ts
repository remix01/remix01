/**
 * Partner Availability API (Rec 7)
 *
 * PATCH /api/partner/availability
 *
 * Body (all optional):
 *   vacation_mode:   boolean  — pause all lead assignment
 *   daily_lead_limit: number  — 0 = no cap; N = max leads per day
 *
 * GET /api/partner/availability — returns current settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function getPartnerId(req: NextRequest): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET(req: NextRequest) {
  const userId = await getPartnerId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('obrtnik_profiles')
    .select('vacation_mode, daily_lead_limit, daily_leads_today, daily_leads_reset_at, active_lead_count, max_active_leads')
    .eq('id', userId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Partner not found' }, { status: 404 })

  return NextResponse.json({ ok: true, data })
}

export async function PATCH(req: NextRequest) {
  const userId = await getPartnerId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowed = ['vacation_mode', 'daily_lead_limit'] as const
  const update: { vacation_mode?: boolean; daily_lead_limit?: number } = {}

  for (const key of allowed) {
    if (key in body) {
      const val = body[key]
      if (key === 'vacation_mode' && typeof val !== 'boolean') {
        return NextResponse.json({ error: 'vacation_mode must be boolean' }, { status: 400 })
      }
      if (key === 'daily_lead_limit') {
        const n = Number(val)
        if (!Number.isInteger(n) || n < 0) {
          return NextResponse.json({ error: 'daily_lead_limit must be a non-negative integer' }, { status: 400 })
        }
      }
      update[key] = val
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('obrtnik_profiles')
    .update(update)
    .eq('id', userId)
    .select('vacation_mode, daily_lead_limit, daily_leads_today, active_lead_count')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  console.log(JSON.stringify({
    level: 'info',
    event: 'partner_availability_updated',
    partnerId: userId,
    update,
  }))

  return NextResponse.json({ ok: true, data })
}
