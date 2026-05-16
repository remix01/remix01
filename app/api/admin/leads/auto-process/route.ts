/**
 * Admin: AI-Assisted Lead Auto-Processing
 *
 * Category: BACKGROUND — AI enriches the decision but is never the blocker.
 *
 * On AI failure (missing key, timeout, API error):
 *   - The lead is SKIPPED (status stays 'lead' for manual review)
 *   - Processing continues for remaining leads
 *   - Failures are logged for observability
 *
 * Leads are only REJECTED when rules-based criteria clearly fail
 * (missing business_name or location_city). AI rejection requires a live AI response.
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'
import { assertLeadTransition } from '@/lib/agent/state-machine'
import { LeadStatus } from '@/lib/state-machine/statuses'
import { evaluateLeadWithAI } from '@/lib/ai/lead-evaluator'

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { limit = 10 } = body

  const { data: leads, error: fetchError } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('id, business_name, description, location_city, avg_rating, total_reviews, source, created_at')
    .eq('profile_status', 'lead')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!leads || leads.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, approved: [], rejected: [], skipped: [] })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  const aiAvailable = !!apiKey
  if (!aiAvailable) {
    console.warn('[leads/auto-process] ANTHROPIC_API_KEY not configured — leads queued for manual review')
  }

  const client = aiAvailable ? new Anthropic({ apiKey: apiKey! }) : null
  const approved: string[] = []
  const rejected: string[] = []
  const skipped: string[] = []

  for (const lead of leads) {
    // Rules-based fast-reject: missing required fields (no AI needed)
    if (!lead.business_name?.trim() || !lead.location_city?.trim()) {
      rejected.push(lead.id)
      continue
    }

    if (!client) {
      skipped.push(lead.id)
      continue
    }

    const decision = await evaluateLeadWithAI(client, lead, 'leads/auto-process')
    if (decision === 'APPROVE') {
      approved.push(lead.id)
    } else if (decision === 'REJECT') {
      rejected.push(lead.id)
    } else {
      skipped.push(lead.id)
    }
  }

  // Validate state transitions before bulk update
  const transitionFailed: string[] = []
  for (const id of approved) {
    try {
      await assertLeadTransition(id, LeadStatus.ACTIVE)
    } catch {
      transitionFailed.push(id)
    }
  }

  const validApproved = approved.filter((id) => !transitionFailed.includes(id))

  if (validApproved.length > 0) {
    const { error: approveError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .update({ profile_status: LeadStatus.ACTIVE, updated_at: new Date().toISOString() })
      .in('id', validApproved)

    if (approveError) {
      console.error('[leads/auto-process] Error approving leads:', approveError)
      return NextResponse.json({ error: approveError.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    ok: true,
    processed: leads.length,
    approved: validApproved,
    // transitionFailed IDs go into rejected (they were AI-approved but invalid state)
    rejected: [...rejected, ...transitionFailed],
    skipped,
    transitionFailed: transitionFailed.length > 0 ? transitionFailed : undefined,
    aiAvailable,
  })
}
