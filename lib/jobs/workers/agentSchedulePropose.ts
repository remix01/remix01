/**
 * Agent Worker — async scheduling proposal via QStash
 *
 * Generates slot proposals asynchronously for large calendar checks
 * or when the synchronous scheduling route times out.
 * Stores results back into the `appointments` table as proposed slots.
 */

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Job } from '../queue'
import { trackTokens } from '@/lib/agent/tokenTracker'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface ScheduleProposePayload {
  userId: string
  povprasevanjeId: string
  obrtnikId: string
  preferences?: string
  preferredTimeOfDay?: 'jutro' | 'dopoldne' | 'popoldne' | 'zvecер'
  durationDays?: number
}

export async function handleAgentSchedulePropose(job: Job<ScheduleProposePayload>): Promise<void> {
  const { userId, povprasevanjeId, obrtnikId, preferences, preferredTimeOfDay, durationDays = 14 } = job.data

  // Load povpraševanje context
  const { data: pov } = await supabaseAdmin
    .from('povprasevanja')
    .select('title, description, category, urgency, location_city')
    .eq('id', povprasevanjeId)
    .single()

  if (!pov) {
    console.error('[agentSchedulePropose] povprasevanje not found:', povprasevanjeId)
    return
  }

  // Load existing appointments for obrtnik (next 14 days) to detect busy slots
  const now = new Date()
  const until = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)
  const { data: existingAppts } = await supabaseAdmin
    .from('appointments')
    .select('scheduled_at, duration_minutes')
    .eq('obrtnik_id', obrtnikId)
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', until.toISOString())

  const busySlots = (existingAppts ?? []).map(a =>
    `${new Date(a.scheduled_at).toLocaleString('sl-SI')} (${a.duration_minutes ?? 60} min)`
  ).join(', ') || 'ni zasedenih terminov'

  const prompt = `Predlagaj 3 optimalne termine za sestanek/ogled dela.

DELO: ${pov.title}
KATEGORIJA: ${pov.category ?? 'splošno'}
NUJNOST: ${pov.urgency ?? 'ni določena'}
LOKACIJA: ${pov.location_city ?? 'ni določena'}
${preferences ? `PREFERENCE STRANKE: ${preferences}` : ''}
${preferredTimeOfDay ? `PREDNOSTNI ČAS: ${preferredTimeOfDay}` : ''}

ZASEDENI TERMINI MOJSTRA: ${busySlots}

Odgovori IZKLJUČNO z veljavnim JSON (brez markdown):
{
  "slots": [
    {
      "datetime": "ISO 8601 datum/čas (naslednja 2 tedna)",
      "label": "Pon, 24. mar ob 9:00",
      "duration_minutes": 60,
      "rationale": "Zakaj je ta termin primeren (1 stavek)"
    }
  ]
}`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

  let parsed: { slots: Array<{ datetime: string; label: string; duration_minutes: number; rationale: string }> }
  try {
    parsed = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''))
  } catch {
    console.error('[agentSchedulePropose] JSON parse failed:', raw)
    return
  }

  // Store proposed slots as pending appointments
  if (parsed.slots?.length) {
    await supabaseAdmin.from('appointments').insert(
      parsed.slots.map(slot => ({
        obrtnik_id: obrtnikId,
        narocnik_id: userId,
        povprasevanje_id: povprasevanjeId,
        scheduled_at: slot.datetime,
        duration_minutes: slot.duration_minutes ?? 60,
        status: 'proposed',
        notes: `AI predlog: ${slot.rationale}`,
      }))
    )
  }

  await trackTokens({
    userId,
    agentName: 'schedule-propose',
    model: 'claude-haiku-4-5-20251001',
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    metadata: { povprasevanjeId, obrtnikId },
  })
}
