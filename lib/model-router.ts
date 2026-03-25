// Model routing: Haiku for simple messages, Sonnet for complex ones
// Expected distribution: ~80% Haiku, ~20% Sonnet

export type ModelSelection = {
  modelId: string
  reason: string
  complexityScore: number
}

// Helper function to safely test patterns on truncated string to avoid ReDoS
function safePatternTest(pattern: RegExp, text: string): boolean {
  // Limit length to first 200 characters to prevent catastrophic backtracking
  const truncated = text.slice(0, 200)
  return pattern.test(truncated)
}

// Patterns that indicate a complex query needing Sonnet
// Improved patterns: avoid nested quantifiers where possible
const COMPLEX_PATTERNS = [
  /primerjaj|primerjava/i,                    // comparison (simple alternation, safe)
  /izračunaj|kalkulacija|cena/i,              // calculation/pricing (safe)
  /analiz|strategij/i,                        // analysis (safe)
  /razloži|pojasni|kako deluje/i,             // detailed explanation (safe)
  /korak.*po.*korak|navodil/i,                // step-by-step (potential issue)
  /pravno|zakonodaj|davek/i,                  // legal/tax (safe)
  /projekt\s*\d+€|vrednost\s*\d+/i,           // project with money amount (safe)
  /pros.*in.*cons|prednosti.*slabosti/i,      // pros/cons (potential issue)
]

export function selectModel(message: string): ModelSelection {
  // Trim and limit length early to prevent ReDoS on very long inputs
  const trimmed = message.trim()
  // If the message is extremely long, take only first 1000 chars for scoring
  const safeMessage = trimmed.length > 1000 ? trimmed.slice(0, 1000) : trimmed

  const wordCount = safeMessage.split(/\s+/).length
  const charCount = safeMessage.length

  let complexityScore = 0

  // Length-based scoring
  if (wordCount > 30) complexityScore += 3
  else if (wordCount > 15) complexityScore += 2
  else if (wordCount > 8) complexityScore += 1

  if (charCount > 200) complexityScore += 2
  else if (charCount > 100) complexityScore += 1

  // Pattern-based scoring using safe function
  for (const pattern of COMPLEX_PATTERNS) {
    if (safePatternTest(pattern, safeMessage)) {
      complexityScore += 2
      break
    }
  }

  // Additional explicit checks for step-by-step and pros/cons to avoid complex regex
  const lowerMessage = safeMessage.toLowerCase()
  if (
    lowerMessage.includes('korak po korak') ||
    lowerMessage.includes('step by step') ||
    lowerMessage.includes('navodila')
  ) {
    complexityScore += 2
  }
  if (
    (lowerMessage.includes('pros') && lowerMessage.includes('cons')) ||
    (lowerMessage.includes('prednosti') && lowerMessage.includes('slabosti'))
  ) {
    complexityScore += 2
  }

  // Question marks and multiple sentences
  const sentenceCount = (safeMessage.match(/[.!?]/g) ?? []).length
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
