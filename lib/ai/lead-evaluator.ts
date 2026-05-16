import Anthropic from '@anthropic-ai/sdk'

export type LeadEvaluation = 'APPROVE' | 'REJECT' | 'SKIP'

export interface LeadInput {
  id: string
  business_name: string
  description?: string | null
  location_city: string
  avg_rating?: number | null
  total_reviews?: number | null
  source?: string | null
}

const EVAL_TIMEOUT_MS = 8_000

/**
 * Evaluates a single lead with AI. Returns SKIP (not REJECT) on any AI failure
 * so that a missing or overloaded AI provider never auto-rejects a valid lead.
 */
export async function evaluateLeadWithAI(
  client: Anthropic,
  lead: LeadInput,
  logPrefix: string
): Promise<LeadEvaluation> {
  const prompt = `Evaluate this business lead for quality approval:

Business Name: ${lead.business_name}
Location: ${lead.location_city}
Description: ${lead.description || 'No description'}
Rating: ${lead.avg_rating ?? 'N/A'}/5 (${lead.total_reviews ?? 0} reviews)
Source: ${lead.source ?? 'unknown'}

Quality criteria:
1. Business name must be present and meaningful (not generic like "Test" or "Service")
2. Description should provide business context (if missing, allow for imports)
3. Location must be a real Slovenian city or region
4. Import sources are generally pre-screened; manual entries need stricter review

Respond with ONLY "APPROVE" or "REJECT" and nothing else.`

  let timerId: ReturnType<typeof setTimeout> | undefined
  try {
    const response = await Promise.race([
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: prompt }],
      }),
      new Promise<never>((_, reject) => {
        timerId = setTimeout(
          () => reject(new Error(`AI eval timeout after ${EVAL_TIMEOUT_MS}ms`)),
          EVAL_TIMEOUT_MS
        )
      }),
    ]).finally(() => clearTimeout(timerId))

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
    console.error(
      `[${logPrefix}] AI evaluation failed for lead ${lead.id} — skipping:`,
      err instanceof Error ? err.message : err
    )
    return 'SKIP'
  }
}
