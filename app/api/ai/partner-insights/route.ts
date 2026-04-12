/**
 * AI Business Advisor — Partner Insights
 *
 * POST /api/ai/partner-insights
 *
 * Analyzes last-30-days performance data for a partner and returns
 * personalised recommendations in Slovenian.
 *
 * Requires PRO or ELITE subscription.
 *
 * Body: { question?: string }   (omit for the default analysis)
 *
 * Response:
 *   {
 *     insights: string[]         // bullet-point observations
 *     recommendations: string[]  // actionable advice
 *     stats: { ... }             // raw numbers used in analysis
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
      return NextResponse.json({ error: 'Neoverjeni' }, { status: 401 })
    }

    // 2. Verify PRO/ELITE
    const { data: partner } = await supabase
      .from('obrtnik_profiles')
      .select('id, subscription_tier, business_name, hourly_rate, rating_avg, total_reviews')
      .eq('id', user.id)
      .maybeSingle()

    if (!partner) {
      return NextResponse.json({ error: 'Profil obrtnika ni najden' }, { status: 403 })
    }

    const tier = partner.subscription_tier
    if (tier !== 'pro' && tier !== 'elite') {
      return NextResponse.json(
        { error: 'PRO ali ELITE paket je obvezen za poslovnega svetovalca' },
        { status: 403 }
      )
    }

    // 3. Gather last-30-day stats
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const isoDate = thirtyDaysAgo.toISOString()

    const [ponudbeRes, prevPonudbeRes] = await Promise.all([
      // Current period: last 30 days
      supabase
        .from('ponudbe')
        .select('id, status, price_estimate, created_at')
        .eq('obrtnik_id', user.id)
        .gte('created_at', isoDate),
      // Previous period: 31-60 days ago (for trend)
      supabase
        .from('ponudbe')
        .select('id, status')
        .eq('obrtnik_id', user.id)
        .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
        .lt('created_at', isoDate),
    ])

    const currentOffers = ponudbeRes.data ?? []
    const prevOffers = prevPonudbeRes.data ?? []

    type OfferRow = { id: string; status: string | null; price_estimate?: number | null; created_at: string }

    const totalSent = currentOffers.length
    const totalAccepted = currentOffers.filter((o: OfferRow) => o.status === 'sprejeta').length
    const conversionRate = totalSent > 0 ? Math.round((totalAccepted / totalSent) * 100) : 0

    const prevSent = prevOffers.length
    const prevAccepted = prevOffers.filter((o: OfferRow) => o.status === 'sprejeta').length
    const prevConversion = prevSent > 0 ? Math.round((prevAccepted / prevSent) * 100) : 0

    const conversionTrend = conversionRate - prevConversion

    const avgPrice =
      currentOffers.length > 0
        ? Math.round(
            currentOffers.reduce((s: number, o: OfferRow) => s + (o.price_estimate || 0), 0) / currentOffers.length
          )
        : 0

    const stats = {
      totalSent,
      totalAccepted,
      conversionRate,
      prevConversion,
      conversionTrend,
      avgPrice,
      ratingAvg: partner.rating_avg ?? null,
      totalReviews: partner.total_reviews ?? 0,
      hourlyRate: partner.hourly_rate ?? null,
    }

    // 4. Optional follow-up question
    const { question } = await request.json().catch(() => ({ question: undefined }))

    // 5. Build prompt
    const systemPrompt = `Si pametni poslovni svetovalec za slovensko platformo LiftGO.
Analiziraš podatke obrtnika in daješ koristne nasvete v slovenščini.
Odgovarjaš vedno v JSON formatu brez markdown.`

    const userPrompt = question
      ? `Obrtnik ${partner.business_name || 'brez imena'} ima naslednje podatke za zadnjih 30 dni:
${JSON.stringify(stats, null, 2)}

Vprašanje obrtnika: "${question}"

Vrni JSON:
{
  "insights": ["opažanje 1", "opažanje 2"],
  "recommendations": ["nasvet 1", "nasvet 2", "nasvet 3"]
}`
      : `Obrtnik ${partner.business_name || 'brez imena'} ima naslednje podatke za zadnjih 30 dni:
${JSON.stringify(stats, null, 2)}

Analiziraj podatke in vrni natanko ta JSON (brez markdown):
{
  "insights": ["Opažanje 1 – konkretno, 1 stavek", "Opažanje 2", "Opažanje 3"],
  "recommendations": ["Nasvet 1 – konkreten in akcijski", "Nasvet 2", "Nasvet 3"]
}

Napotki:
- insights: kar opaziš v podatkih (trendi, primerjave)
- recommendations: kaj naj obrtnik naredi za izboljšanje
- Vse v slovenščini, profesionalno, brez praznih fraz`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

    let result: { insights: string[]; recommendations: string[] }
    try {
      result = JSON.parse(jsonStr)
    } catch {
      result = { insights: [raw], recommendations: [] }
    }

    return NextResponse.json({ success: true, ...result, stats })
  } catch (error) {
    console.error('[partner-insights] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Napaka pri poslovnem svetovalcu' },
      { status: 500 }
    )
  }
}
