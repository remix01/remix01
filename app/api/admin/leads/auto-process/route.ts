import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

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
    return NextResponse.json({ ok: true, processed: 0, approved: [], rejected: [] })
  }

  const client = new Anthropic({ apiKey })
  const approved: string[] = []
  const rejected: string[] = []

  for (const lead of leads) {
    try {
      const prompt = `Evaluate this business lead for quality approval:

Business Name: ${lead.business_name}
Location: ${lead.location_city}
Description: ${lead.description || 'No description'}
Rating: ${lead.avg_rating}/5 (${lead.total_reviews} reviews)
Source: ${lead.source}

Quality criteria:
1. Business name must be present and meaningful (not generic like "Service")
2. Description should provide business context
3. Location should be specific (city name, not empty)
4. Auto-import sources are quality-checked; manual adds are generally approved

Respond with ONLY "APPROVE" or "REJECT" and nothing else.`

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: prompt }],
      })

      const decision = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as any).text)
        .join('')
        .trim()
        .toUpperCase()

      if (decision.includes('APPROVE')) {
        approved.push(lead.id)
      } else {
        rejected.push(lead.id)
      }
    } catch (err) {
      console.error(`[leads/auto-process] Error evaluating lead ${lead.id}:`, err)
      rejected.push(lead.id)
    }
  }

  if (approved.length > 0) {
    const { error: approveError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .update({ profile_status: 'active', updated_at: new Date().toISOString() })
      .in('id', approved)

    if (approveError) {
      console.error('[leads/auto-process] Error approving leads:', approveError)
      return NextResponse.json({ error: approveError.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    ok: true,
    processed: leads.length,
    approved,
    rejected,
  })
}
