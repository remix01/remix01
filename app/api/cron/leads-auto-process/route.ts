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

const AI_TIMEOUT_MS = 8_000

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/leads-auto-process] CRON_SECRET is not configured')
    return false
  }
  return authHeader === `Bearer ${cronSecret}`
}

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
    console.error(`[cron/leads-auto-process] AI evaluation failed for lead ${lead.id} — skipping:`, err instanceof Error ? err.message : err)
    return 'SKIP'
  }
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

    const decision = await evaluateLeadWithAI(client, lead)
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
