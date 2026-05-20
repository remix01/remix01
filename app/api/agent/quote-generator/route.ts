import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { estimateCost } from '@/lib/model-router'
import { getAgentDefinition } from '@/lib/agents/ai-definitions'
import { buildRAGContext, formatRAGContextForPrompt } from '@/lib/ai/rag'
import type { AIAgentType } from '@/lib/agents/ai-router'
import { loadAiUsageProfile, normalizeDailyUsageWindow, evaluateAgentTierAccess, incrementDailyUsage } from '@/lib/agents/route-access-policy'
import { logAgentUsage } from '@/lib/agents/usage-logging'
import { checkAIRateLimit } from '@/lib/rate-limit/limiters'
import { validateAgentOutput, QuoteGeneratorSchema, buildStructuredOutputInstruction } from '@/lib/ai/structured-output'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

    const rateLimitResponse = await checkAIRateLimit(req, user.id)
    if (rateLimitResponse) return rateLimitResponse

    const { povprasevanje_id, extra_notes } = await req.json()
    if (!povprasevanje_id) return NextResponse.json({ error: 'povprasevanje_id je obvezen.' }, { status: 400 })

    // Get obrtnik profile linked to this user
    const { data: obrtnik } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, business_name, description, hourly_rate, years_experience, subscription_tier, avg_rating')
      .eq('id', user.id)
      .maybeSingle()
    if (!obrtnik) return NextResponse.json({ error: 'Profil obrtnika ni najden.' }, { status: 404 })

    const tier = obrtnik.subscription_tier ?? 'start'
    const access = evaluateAgentTierAccess('quote_generator' as AIAgentType, tier)
    if (!access.allowed) {
      return NextResponse.json({ error: 'Ni dostopa.', upgrade_required: true }, { status: 403 })
    }

    const dailyLimit = access.dailyLimit
    const profile = await loadAiUsageProfile(user.id)
    const effectiveUsed = await normalizeDailyUsageWindow(user.id, profile)
    if (effectiveUsed >= dailyLimit) {
      return NextResponse.json({ error: `Dnevni limit dosežen (${dailyLimit}).`, limit_reached: true }, { status: 429 })
    }

    // Load povpraševanje
    const { data: pov } = await supabaseAdmin
      .from('povprasevanja')
      .select('id, title, description, location_city, urgency, budget_min, budget_max, preferred_date_from, preferred_date_to')
      .eq('id', povprasevanje_id)
      .maybeSingle()
    if (!pov) return NextResponse.json({ error: 'Povpraševanje ni najdeno.' }, { status: 404 })

    const agentDef = await getAgentDefinition('quote_generator')
    const context = {
      obrtnik: { business_name: obrtnik.business_name, hourly_rate: obrtnik.hourly_rate, years_experience: obrtnik.years_experience, avg_rating: obrtnik.avg_rating },
      povprasevanje: { title: pov.title, description: pov.description, location_city: pov.location_city, urgency: pov.urgency, budget_min: pov.budget_min, budget_max: pov.budget_max },
      extra_notes,
    }

    let ragSection = ''
    try {
      const ragContext = await buildRAGContext(pov.title || pov.description || '', {
        includeTasks: true,
        includeOffers: true,
        taskId: povprasevanje_id,
        maxPerSource: 3,
      })
      ragSection = formatRAGContextForPrompt(ragContext)
    } catch {
      // RAG is optional enrichment
    }

    const structuredInstruction = buildStructuredOutputInstruction('quote_generator')
    const systemPrompt = agentDef.system_prompt + `\n\n---\nKONTEKST:\n${JSON.stringify(context, null, 2)}${ragSection}${structuredInstruction}`

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const startTime = Date.now()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generiraj osnutek ponudbe za to povpraševanje.' }],
    })

    const rawText = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const costUsd = estimateCost('claude-sonnet-4-6', inputTokens, outputTokens)

    const validated = validateAgentOutput(QuoteGeneratorSchema, rawText)
    const draftText = validated.success ? validated.data.draftText : rawText
    const priceMin = validated.success ? validated.data.priceEstimate.min : null
    const priceMax = validated.success ? validated.data.priceEstimate.max : null
    const durationText = validated.success ? validated.data.timeline : null

    const { data: draft } = await supabaseAdmin
      .from('agent_quote_drafts')
      .insert({
        obrtnik_id: obrtnik.id,
        povprasevanje_id,
        draft_text: draftText,
        price_min: priceMin,
        price_max: priceMax,
        duration_text: durationText,
        context_used: context,
        status: 'draft',
      })
      .select('id')
      .single()

    await incrementDailyUsage(user.id, effectiveUsed + 1)
    await (supabaseAdmin.rpc('upsert_agent_cost_summary' as any, {
      p_user_id: user.id, p_agent_type: 'quote_generator',
      p_tokens_in: inputTokens, p_tokens_out: outputTokens, p_cost_usd: costUsd,
    }) as any).catch(() => {})
    await logAgentUsage({
      userId: user.id,
      modelUsed: 'sonnet-4',
      tokensInput: inputTokens,
      tokensOutput: outputTokens,
      costUsd,
      responseCached: false,
      agentType: 'quote_generator',
      userMessage: `quote for: ${pov.title?.slice(0,100)}` ,
      responseTimeMs: Date.now() - startTime,
    }).catch(() => {})

    return NextResponse.json({
      draft_text: draftText,
      draft_id: draft?.id,
      structured: validated.success ? validated.data : null,
      usage: { used: effectiveUsed + 1, limit: dailyLimit },
    })
  } catch (error) {
    console.error('[agent/quote-generator] POST:', error)
    return NextResponse.json({ error: 'Napaka pri generiranju ponudbe.' }, { status: 500 })
  }
}
