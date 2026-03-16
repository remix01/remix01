import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { povprasevanjeId } = await req.json()
    if (!povprasevanjeId) {
      return NextResponse.json({ error: 'povprasevanjeId je obvezen' }, { status: 400 })
    }

    // Auth — only the owning naročnik (or background calls with service role)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nepooblaščen dostop' }, { status: 401 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI ni konfiguriran' }, { status: 503 })
    }

    // Fetch the povprasevanje
    const { data: povprasevanje } = await supabaseAdmin
      .from('povprasevanja')
      .select('id, title, description, urgency, narocnik_id, category:categories(name, slug)')
      .eq('id', povprasevanjeId)
      .maybeSingle()

    if (!povprasevanje) {
      return NextResponse.json({ error: 'Povpraševanje ni najdeno' }, { status: 404 })
    }

    // Ownership check
    if (povprasevanje.narocnik_id !== user.id) {
      return NextResponse.json({ error: 'Dostop zavrnjen' }, { status: 403 })
    }

    // Build prompt
    const categoryName = (povprasevanje.category as any)?.name ?? 'neznana kategorija'
    const prompt = `Analiziraj to povpraševanje za storitev v Slovenji in vrni JSON.

Kategorija: ${categoryName}
Naslov: ${povprasevanje.title}
Opis: ${povprasevanje.description}

Vrni SAMO veljavni JSON brez dodatnega teksta:
{
  "keywords": ["ključna", "beseda1", "beseda2"],  // 3-8 tehničnih in opisnih ključnih besed
  "urgency": "normalno" | "kmalu" | "nujno",       // zaznana nujnost iz opisa
  "urgency_reason": "kratko pojasnilo"              // zakaj ta nujnost
}

Pravila za urgency:
- "nujno": besede kot takoj, danes, urgentno, nujno, hitro, pokvarjeno, poplava, nevarno
- "kmalu": ta teden, čim prej, v kratkem, kmalu
- "normalno": vse ostalo`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    // Parse JSON — extract from ```json ... ``` if wrapped
    let parsed: { keywords?: string[]; urgency?: string; urgency_reason?: string } = {}
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      }
    } catch {
      console.error('[categorize] JSON parse failed:', rawText)
      return NextResponse.json({ success: false, error: 'AI response invalid' })
    }

    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((k): k is string => typeof k === 'string').slice(0, 10)
      : []

    const validUrgencies = ['normalno', 'kmalu', 'nujno']
    const aiUrgency = validUrgencies.includes(parsed.urgency ?? '') ? parsed.urgency! : null

    // Update povprasevanje with AI analysis
    const updatePayload: Record<string, unknown> = { keywords }
    if (aiUrgency) updatePayload.ai_urgency_detected = aiUrgency

    const { error: updateError } = await supabaseAdmin
      .from('povprasevanja')
      .update(updatePayload)
      .eq('id', povprasevanjeId)

    if (updateError) {
      console.error('[categorize] Update error:', updateError)
      return NextResponse.json({ success: false, error: updateError.message })
    }

    console.log(`[categorize] povprasevanje=${povprasevanjeId} keywords=${keywords.length} urgency=${aiUrgency}`)

    return NextResponse.json({
      success: true,
      keywords,
      ai_urgency: aiUrgency,
      urgency_reason: parsed.urgency_reason ?? null,
    })
  } catch (err: any) {
    console.error('[categorize] Error:', err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
