/**
 * Structured Output Schemas for LiftGO AI Agents
 *
 * Each agent has a Zod schema defining its expected output.
 * Used with Anthropic's tool_choice to force structured JSON responses,
 * then validated server-side before storage.
 */

import { z } from 'zod'

// ═══════════════════════════════════════════════════════════════════════════
// Agent Output Schemas
// ═══════════════════════════════════════════════════════════════════════════

export const OfferComparisonSchema = z.object({
  summary: z.string().describe('Kratka analiza v 2-3 stavkih'),
  recommendation: z.string().describe('ID priporočene ponudbe in razlog'),
  warnings: z.array(z.string()).describe('Opozorila za stranko'),
  comparison: z.array(z.object({
    ponudbaId: z.string(),
    businessName: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    valueScore: z.number().min(1).max(10),
    comment: z.string(),
  })),
  avgPrice: z.number().optional(),
  priceRange: z.string().optional(),
})

export const VideoDiagnosisSchema = z.object({
  problemDescription: z.string(),
  severity: z.enum(['nizka', 'srednja', 'visoka']),
  suggestedCategories: z.array(z.string()),
  recommendedExperts: z.array(z.string()),
  urgency: z.enum(['normalno', 'kmalu', 'nujno']),
  descriptionForMaster: z.string(),
  descriptionForCustomer: z.string(),
  suggestedTitle: z.string(),
  warnings: z.array(z.string()),
  additionalPhotosNeeded: z.array(z.string()),
  canDiagnose: z.boolean(),
})

export const QuoteGeneratorSchema = z.object({
  greeting: z.string().describe('Uvodni pozdrav za stranko'),
  scopeOfWork: z.string().describe('Opis obsega dela'),
  priceEstimate: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.literal('EUR'),
    includesVAT: z.boolean(),
  }),
  timeline: z.string().describe('Ocena trajanja del'),
  materialsIncluded: z.boolean(),
  warranty: z.string().optional(),
  draftText: z.string().describe('Celotno besedilo ponudbe'),
})

export const MaterialsListSchema = z.object({
  material_list: z.array(z.object({
    name: z.string(),
    quantity: z.string(),
    unit: z.string(),
    price_min_eur: z.number().optional(),
    price_max_eur: z.number().optional(),
  })),
  skupaj_ocena_eur: z.object({
    min: z.number(),
    max: z.number(),
  }).optional(),
  dobavitelji: z.array(z.string()).optional(),
  predracun_tekst: z.string().optional(),
})

export const JobSummarySchema = z.object({
  title: z.string(),
  summary: z.string(),
  workPerformed: z.array(z.string()),
  materialsUsed: z.array(z.string()),
  totalHours: z.number().optional(),
  recommendations: z.array(z.string()),
  warrantyNote: z.string().optional(),
})

export const ParseInquirySchema = z.object({
  title: z.string(),
  description: z.string(),
  suggestedCategory: z.string(),
  urgency: z.enum(['normalno', 'kmalu', 'nujno']),
  followUpQuestions: z.array(z.string()).max(3),
})

// ═══════════════════════════════════════════════════════════════════════════
// Schema Registry
// ═══════════════════════════════════════════════════════════════════════════

export const AGENT_OUTPUT_SCHEMAS: Record<string, z.ZodType> = {
  offer_comparison: OfferComparisonSchema,
  video_diagnosis: VideoDiagnosisSchema,
  quote_generator: QuoteGeneratorSchema,
  materials_agent: MaterialsListSchema,
  job_summary: JobSummarySchema,
  parse_inquiry: ParseInquirySchema,
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate and parse an AI response against the agent's schema.
 * Returns { success: true, data } or { success: false, raw, error }.
 */
export function validateAgentOutput<T extends z.ZodType>(
  schema: T,
  rawText: string
): { success: true; data: z.infer<T> } | { success: false; raw: string; error: string } {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { success: false, raw: rawText, error: 'No JSON object found in response' }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    const result = schema.safeParse(parsed)
    if (result.success) {
      return { success: true, data: result.data }
    }
    return {
      success: false,
      raw: rawText,
      error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
    }
  } catch (err) {
    return { success: false, raw: rawText, error: 'Invalid JSON' }
  }
}

/**
 * Build a JSON output instruction suffix for system prompts.
 * Includes the schema description so the LLM knows the expected shape.
 */
export function buildStructuredOutputInstruction(agentType: string): string {
  const schema = AGENT_OUTPUT_SCHEMAS[agentType]
  if (!schema) return ''

  return '\n\nOdgovori SAMO v veljavnem JSON formatu brez markdown blokov. Struktura mora vsebovati vsa zahtevana polja.'
}
