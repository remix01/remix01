/**
 * Agent Worker — async video/image analysis via QStash
 *
 * Processes image uploads from the video-diagnosis feature asynchronously.
 * Used when the image is large or when analysis should not block the HTTP request.
 * Stores results in agent_token_usage and optionally updates a diagnosis record.
 */

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Job } from '../queue'
import { trackTokens } from '@/lib/agent/tokenTracker'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface VideoAnalyzePayload {
  userId: string
  imageBase64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  category?: string
  contextDescription?: string
  /** Optional: store result linked to this record */
  povprasevanjeId?: string
}

export async function handleAgentVideoAnalyze(job: Job<VideoAnalyzePayload>): Promise<void> {
  const { userId, imageBase64, mediaType, category, contextDescription, povprasevanjeId } = job.data

  const categoryHint = category ? `Kategorija dela: ${category}.` : ''
  const contextHint = contextDescription ? `Kontekst: ${contextDescription}.` : ''

  const systemPrompt = `Si LiftGO strokovnjak za diagnostiko poškodb in gradbenih del v Sloveniji.
Analiziraš slike za oceno obsega potrebnega dela.
Odgovori IZKLJUČNO z veljavnim JSON (brez markdown).`

  const userPrompt = `${categoryHint} ${contextHint}
Analiziraj sliko in vrni:
{
  "severity": "nizka" | "srednja" | "visoka" | "kritična",
  "urgency": "ni nujno" | "ta teden" | "jutri" | "takoj",
  "categories": ["kategorija1"],
  "descriptionForMaster": "tehnični opis za mojstra (2-3 stavki)",
  "descriptionForCustomer": "razumljiv opis za stranko (2-3 stavki)",
  "estimatedDuration": "ocena trajanja dela",
  "warnings": ["opozorilo1"]
}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 900,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: imageBase64,
          },
        },
        { type: 'text', text: userPrompt },
      ],
    }],
    system: systemPrompt,
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
  let result: Record<string, unknown>
  try {
    result = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''))
  } catch {
    console.error('[agentVideoAnalyze] JSON parse failed:', raw)
    return
  }

  // If linked to a povprasevanje, store the diagnosis result as metadata
  if (povprasevanjeId) {
    await supabaseAdmin
      .from('povprasevanja')
      .update({
        ai_diagnosis: result,
        ai_diagnosed_at: new Date().toISOString(),
      })
      .eq('id', povprasevanjeId)
      .eq('narocnik_id', userId)
  }

  await trackTokens({
    userId,
    agentName: 'video-diagnosis',
    model: 'claude-sonnet-4-5-20250514',
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    metadata: { povprasevanjeId, async: true },
  })
}
