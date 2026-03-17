// Model routing: Haiku for simple messages, Sonnet for complex ones
// Expected distribution: ~80% Haiku, ~20% Sonnet

export type ModelSelection = {
  modelId: string
  reason: string
  complexityScore: number
}

// Patterns that indicate a complex query needing Sonnet
const COMPLEX_PATTERNS = [
  /primerjaj|primerjava/i,         // comparison
  /izračunaj|kalkulacija|cena/i,   // calculation/pricing
  /pros.*in.*cons|prednosti.*slabosti/i,
  /analiz|strategij/i,             // analysis
  /razloži|pojasni|kako deluje/i,  // detailed explanation
  /korak.*po.*korak|navodil/i,     // step-by-step
  /pravno|zakonodaj|davek/i,       // legal/tax
  /projekt.*\d+€|vrednost.*\d+/i,  // project with money amount
]

export function selectModel(message: string): ModelSelection {
  const trimmed = message.trim()
  const wordCount = trimmed.split(/\s+/).length
  const charCount = trimmed.length

  let complexityScore = 0

  // Length-based scoring
  if (wordCount > 30) complexityScore += 3
  else if (wordCount > 15) complexityScore += 2
  else if (wordCount > 8) complexityScore += 1

  if (charCount > 200) complexityScore += 2
  else if (charCount > 100) complexityScore += 1

  // Pattern-based scoring
  for (const pattern of COMPLEX_PATTERNS) {
    if (pattern.test(trimmed)) {
      complexityScore += 2
      break
    }
  }

  // Question marks and multiple sentences
  const sentenceCount = (trimmed.match(/[.!?]/g) ?? []).length
  if (sentenceCount > 2) complexityScore += 1

  if (complexityScore >= 4) {
    return {
      modelId: 'claude-sonnet-4-6',
      reason: `complex (score: ${complexityScore})`,
      complexityScore,
    }
  }

  return {
    modelId: 'claude-haiku-4-5-20251001',
    reason: `simple (score: ${complexityScore})`,
    complexityScore,
  }
}

// Token cost in USD per 1M tokens (as of 2026)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
}

export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[modelId] ?? MODEL_COSTS['claude-sonnet-4-6']
  return (inputTokens / 1_000_000) * costs.input + (outputTokens / 1_000_000) * costs.output
}
