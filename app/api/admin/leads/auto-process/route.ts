/**
 * Admin: AI-Assisted Lead Auto-Processing
 *
 * Category: BACKGROUND — AI enriches the decision but is never the blocker.
 *
 * On AI failure (missing key, timeout, API error):
 *   - The lead is SKIPPED (status stays 'lead' for manual review)
 *   - The cron/admin continues processing remaining leads
 *   - A structured error is logged for observability
 *
 * Leads are only REJECTED when rules-based criteria clearly fail
 * (missing business_name or location_city). AI rejection requires AI.
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'
import { assertLeadTransition } from '@/lib/agent/state-machine'
import { withIdempotency } from '@/lib/idempotency/withIdempotency'
import { LeadStatus } from '@/lib/state-machine/statuses'

const AI_TIMEOUT_MS = 8_000

async function evaluateLeadWithAI(
  client: Anthropic,
  lead: { id: string; business_name: string; description?: string; location_city: string; avg_rating?: number; total_reviews?: number; source?: string }
): Promise<'APPROVE' | 'REJECT' | 'SKIP'> {
  const prompt = `Evaluate this business lead for quality approval:

Business Name: ${lead.business_name}
Location: ${lead.location_city}
Description: ${lead.description || 'No description'}
Rating: ${lead.avg_rating}/5 (${lead.total_reviews} reviews)
Source: ${lead.source}

Quality criteria:
1. Business name must be present and meaningful (not generic like "Test" or "Service")
2. Description should provide business context (if missing, allow for imports)
3. Location must be a real Slovenian city or region
4. Import sources are generally pre-screened; manual entries need stricter review

Respond with ONLY "APPROVE" or "REJECT" and nothing else.`

  try {
    const response = await Promise.race([
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: prompt }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`AI timeout after ${AI_TIMEOUT_MS}ms`)), AI_TIMEOUT_MS)
      ),
    ])

    const decision = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()
      .toUpperCase()

    if (decision.includes('APPROVE')) return 'APPROVE'
    if (decision.includes('REJECT')) return 'REJECT'
    return 'SKIP'
  } catch (err) {
    // AI failure — SKIP, do not auto-reject
    console.error(`[leads/auto-process] AI evaluation failed for lead ${lead.id} — skipping:`, err instanceof Error ? err.message : err)
    return 'SKIP'
  }
}

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
  // AI unavailable — all leads that pass rules-check are skipped for manual review
  const aiAvailable = !!apiKey
  if (!aiAvailable) {
    console.warn('[leads/auto-process] ANTHROPIC_API_KEY not configured — AI scoring skipped, leads queued for manual review')
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
      // No AI — defer to manual review
      skipped.push(lead.id)
      continue
    }

    const decision = await evaluateLeadWithAI(client, lead)
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
    rejected: [...rejected, ...transitionFailed],
    skipped: [...skipped, ...transitionFailed.filter((id) => !rejected.includes(id))],
    transitionFailed: transitionFailed.length > 0 ? transitionFailed : undefined,
    aiAvailable,
  })
}
