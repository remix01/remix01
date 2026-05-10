import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'

function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return process.env.NODE_ENV !== 'production'
  }
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
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
    return NextResponse.json({ ok: true, processed: 0, approved: [], rejected: [] })
  }

  const client = new Anthropic({ apiKey })
  const approved: string[] = []
  const rejected: string[] = []

  for (const lead of leads) {
    // Fast-reject leads missing required fields without calling AI
    if (!lead.business_name?.trim() || !lead.location_city?.trim()) {
      rejected.push(lead.id)
      continue
    }

    try {
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

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: prompt }],
      })

      const decision = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('')
        .trim()
        .toUpperCase()

      if (decision.includes('APPROVE')) {
        approved.push(lead.id)
      } else {
        rejected.push(lead.id)
      }
    } catch (err) {
      console.error(`[cron/leads-auto-process] Error evaluating lead ${lead.id}:`, err)
      rejected.push(lead.id)
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
    `[cron/leads-auto-process] processed=${leads.length} approved=${approved.length} rejected=${rejected.length}`
  )

  return NextResponse.json({
    ok: true,
    processed: leads.length,
    approved,
    rejected,
  })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
