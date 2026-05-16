/**
 * Cron: AI-Assisted Lead Auto-Processing
 *
 * Category: BACKGROUND — AI enriches but never blocks.
 *
 * On AI failure (missing key, timeout, API error):
 *   - Lead is SKIPPED (status stays 'lead' for manual review)
 *   - Cron continues processing remaining leads
 *   - Failures are logged for observability
 *
 * Only rules-based criteria (missing name/city) trigger an immediate reject.
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { evaluateLeadWithAI } from '@/lib/ai/lead-evaluator'

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/leads-auto-process] CRON_SECRET is not configured')
    return false
  }
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50

  const { data: leads, error: fetchError } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('id, business_name, description, location_city, avg_rating, total_reviews, source, created_at')
    .eq('profile_status', 'lead')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (fetchError) {
    console.error('[cron/leads-auto-process] Fetch error:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!leads || leads.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, approved: [], rejected: [], skipped: [] })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  const aiAvailable = !!apiKey
  if (!aiAvailable) {
    console.warn('[cron/leads-auto-process] ANTHROPIC_API_KEY not configured — leads queued for manual review')
  }

  const client = aiAvailable ? new Anthropic({ apiKey: apiKey! }) : null
  const approved: string[] = []
  const rejected: string[] = []
  const skipped: string[] = []

  for (const lead of leads) {
    // Rules-based fast-reject: missing required fields
    if (!lead.business_name?.trim() || !lead.location_city?.trim()) {
      rejected.push(lead.id)
      continue
    }

    if (!client) {
      skipped.push(lead.id)
      continue
    }

    const decision = await evaluateLeadWithAI(client, lead, 'cron/leads-auto-process')
    if (decision === 'APPROVE') {
      approved.push(lead.id)
    } else if (decision === 'REJECT') {
      rejected.push(lead.id)
    } else {
      skipped.push(lead.id)
    }
  }

  const now = new Date().toISOString()

  if (approved.length > 0) {
    const { error: approveError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .update({ profile_status: 'active', updated_at: now })
      .in('id', approved)

    if (approveError) {
      console.error('[cron/leads-auto-process] Approve error:', approveError)
      return NextResponse.json({ error: approveError.message }, { status: 500 })
    }
  }

  if (rejected.length > 0) {
    const { error: rejectError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .update({ profile_status: 'inactive', updated_at: now })
      .in('id', rejected)

    if (rejectError) {
      console.error('[cron/leads-auto-process] Reject error:', rejectError)
    }
  }

  console.log(
    `[cron/leads-auto-process] processed=${leads.length} approved=${approved.length} rejected=${rejected.length} skipped=${skipped.length} aiAvailable=${aiAvailable}`
  )

  return NextResponse.json({
    ok: true,
    processed: leads.length,
    approved,
    rejected,
    skipped,
    aiAvailable,
  })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
