/**
 * Agent Worker — handles async agent jobs dispatched via QStash
 *
 * Currently supports: generate_job_summary
 * Runs outside the HTTP request cycle; has full 60s timeout budget.
 */

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Job } from '../queue'
import { trackTokens } from '@/lib/agent/tokenTracker'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface JobSummaryPayload {
  ponudbaId: string
  obrtnikId: string
  userId: string
  hoursWorked?: number
  materialsUsed?: { name: string; quantity: string; price?: number }[]
  additionalNotes?: string
}

export async function handleGenerateJobSummary(job: Job<JobSummaryPayload>): Promise<void> {
  const { ponudbaId, obrtnikId, userId, hoursWorked, materialsUsed, additionalNotes } =
    job.data

  // Load ponudba with full context
  const { data: ponudba } = await supabaseAdmin
    .from('ponudbe')
    .select(`
      id, message, price_estimate, price_type, status, accepted_at,
      povprasevanje:povprasevanja(
        id, title, description, location_city, category:categories(name),
        narocnik_id
      ),
      obrtnik:obrtnik_profiles(business_name, description)
    `)
    .eq('id', ponudbaId)
    .single()

  if (!ponudba) {
    console.error('[agentWorker] ponudba not found:', ponudbaId)
    return
  }

  const pov = ponudba.povprasevanje as any
  const obrtnik = ponudba.obrtnik as any

  const systemPrompt = `Si LiftGO asistent za pripravo poročil o opravljenih delih v Sloveniji.
Pišeš profesionalna poročila v slovenščini.
Poročilo je namenjeno stranki za pregled in arhiv.
Odgovori SAMO v JSON formatu brez markdown blokov.`

  const materialsText = materialsUsed && materialsUsed.length > 0
    ? '\nPorabljeni materiali:\n' + materialsUsed.map(m =>
        `- ${m.name}: ${m.quantity}${m.price ? ` (${m.price} EUR)` : ''}`
      ).join('\n')
    : ''

  const userPrompt = `Pripravi poročilo o opravljenem delu:

POVPRAŠEVANJE: ${pov?.title || 'N/A'}
OPIS: ${pov?.description || ''}
LOKACIJA: ${pov?.location_city || ''}
KATEGORIJA: ${(pov?.category as any)?.name || ''}
MOJSTER: ${obrtnik?.business_name || ''}
DOGOVORJENA CENA: ${ponudba.price_estimate ? `${ponudba.price_estimate} EUR (${ponudba.price_type})` : 'Po dogovoru'}
${hoursWorked ? `PORABLJENE URE: ${hoursWorked}` : ''}${materialsText}
${additionalNotes ? `OPOMBE: ${additionalNotes}` : ''}

Vrni JSON:
{
  "summaryText": "celotno besedilo poročila za stranko (3-6 odstavkov)",
  "shortSummary": "2-3 stavki za email predmet",
  "workCompleted": ["opravili 1", "opravljeno 2"],
  "materialsUsed": [{"name": "material", "quantity": "1 kos", "price": 10.00}],
  "totalCost": 150.00,
  "warrantyNotes": "garancija/jamstvo info",
  "recommendations": ["priporočilo za vzdrževanje"],
  "customerActionRequired": false,
  "generatedAt": "${new Date().toISOString()}"
}`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  // Track tokens
  const usage = response.usage
  trackTokens({
    userId,
    agentName: 'job-summary',
    model: 'claude-haiku-4-5-20251001',
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    metadata: { ponudbaId },
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as any).text)
    .join('')

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = { summaryText: text, workCompleted: [], materialsUsed: materialsUsed ?? [] }
  }

  // Persist result
  await supabaseAdmin
    .from('agent_job_summaries')
    .upsert(
      {
        ponudba_id: ponudbaId,
        obrtnik_id: obrtnikId,
        narocnik_id: pov?.narocnik_id,
        summary_text: parsed.summaryText || text,
        materials_used: parsed.materialsUsed ?? materialsUsed ?? [],
        hours_worked: hoursWorked ?? null,
        status: 'draft',
      },
      { onConflict: 'ponudba_id' }
    )

  console.log('[agentWorker] job summary generated:', ponudbaId)
}
