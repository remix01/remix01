/**
 * A/B Testing Router for LiftGO AI
 *
 * Hash-based deterministic routing: same user always sees the same variant.
 * Tracks latency, success rate, and quality metrics per variant.
 */

import { createHash } from 'crypto'

// ═══════════════════════════════════════════════════════════════════════════
// Test Definitions
// ═══════════════════════════════════════════════════════════════════════════

export interface ABVariant {
  id: string
  weight: number // 0-100, must sum to 100 across variants
  model?: string
  systemPromptSuffix?: string
  maxTokens?: number
  temperature?: number
}

export interface ABTest {
  id: string
  agentType: string
  enabled: boolean
  startDate: string // ISO date
  endDate?: string  // ISO date, undefined = indefinite
  variants: ABVariant[]
}

export const AB_TESTS: ABTest[] = [
  {
    id: 'offer-comparison-model-v1',
    agentType: 'offer_comparison',
    enabled: true,
    startDate: '2026-05-19',
    variants: [
      { id: 'control', weight: 70, model: 'claude-haiku-4-5-20251001' },
      { id: 'sonnet', weight: 30, model: 'claude-sonnet-4-6' },
    ],
  },
  {
    id: 'quote-prompt-tone-v1',
    agentType: 'quote_generator',
    enabled: true,
    startDate: '2026-05-19',
    variants: [
      { id: 'formal', weight: 50, systemPromptSuffix: '\nUporabi formalen, profesionalen ton.' },
      { id: 'friendly', weight: 50, systemPromptSuffix: '\nUporabi prijazen, neformalen ton.' },
    ],
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// Routing
// ═══════════════════════════════════════════════════════════════════════════

function hashToPercent(userId: string, testId: string): number {
  const hash = createHash('sha256').update(`${userId}:${testId}`).digest()
  return ((hash[0]! << 8) | hash[1]!) % 100
}

export function getActiveTest(agentType: string): ABTest | null {
  const now = new Date().toISOString().slice(0, 10)
  return AB_TESTS.find(t =>
    t.enabled &&
    t.agentType === agentType &&
    t.startDate <= now &&
    (!t.endDate || t.endDate >= now)
  ) ?? null
}

export function assignVariant(test: ABTest, userId: string): ABVariant {
  const pct = hashToPercent(userId, test.id)
  let cumulative = 0
  for (const variant of test.variants) {
    cumulative += variant.weight
    if (pct < cumulative) return variant
  }
  return test.variants[test.variants.length - 1]!
}

export interface ABAssignment {
  testId: string
  variantId: string
  variant: ABVariant
}

export function getABAssignment(agentType: string, userId: string): ABAssignment | null {
  const test = getActiveTest(agentType)
  if (!test) return null
  const variant = assignVariant(test, userId)
  return { testId: test.id, variantId: variant.id, variant }
}

// ═══════════════════════════════════════════════════════════════════════════
// Metrics
// ═══════════════════════════════════════════════════════════════════════════

interface VariantMetrics {
  impressions: number
  totalLatencyMs: number
  successes: number
  failures: number
  qualityScoreSum: number
  qualityScoreCount: number
}

const metricsStore = new Map<string, VariantMetrics>()

function metricsKey(testId: string, variantId: string): string {
  return `${testId}:${variantId}`
}

function getOrCreateMetrics(testId: string, variantId: string): VariantMetrics {
  const key = metricsKey(testId, variantId)
  let m = metricsStore.get(key)
  if (!m) {
    m = { impressions: 0, totalLatencyMs: 0, successes: 0, failures: 0, qualityScoreSum: 0, qualityScoreCount: 0 }
    metricsStore.set(key, m)
  }
  return m
}

export function recordABImpression(testId: string, variantId: string, latencyMs: number, success: boolean): void {
  const m = getOrCreateMetrics(testId, variantId)
  m.impressions++
  m.totalLatencyMs += latencyMs
  if (success) m.successes++
  else m.failures++
}

export function recordABQualityScore(testId: string, variantId: string, score: number): void {
  const m = getOrCreateMetrics(testId, variantId)
  m.qualityScoreSum += score
  m.qualityScoreCount++
}

export interface ABMetricsSummary {
  testId: string
  variantId: string
  impressions: number
  avgLatencyMs: number
  successRate: number
  avgQualityScore: number | null
}

export function getABMetrics(): ABMetricsSummary[] {
  const results: ABMetricsSummary[] = []
  for (const [key, m] of metricsStore) {
    const [testId, variantId] = key.split(':')
    results.push({
      testId: testId!,
      variantId: variantId!,
      impressions: m.impressions,
      avgLatencyMs: m.impressions > 0 ? Math.round(m.totalLatencyMs / m.impressions) : 0,
      successRate: m.impressions > 0 ? m.successes / m.impressions : 0,
      avgQualityScore: m.qualityScoreCount > 0 ? m.qualityScoreSum / m.qualityScoreCount : null,
    })
  }
  return results
}

export const _testExports = { metricsStore, hashToPercent }
