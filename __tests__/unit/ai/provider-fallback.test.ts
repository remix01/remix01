/**
 * Tests for adaptive provider fallback logic in lib/ai/providers.ts
 *
 * Validates: penalty escalation, exponential backoff, success reset,
 * and provider ordering under simulated failures.
 */

// Mock env module before importing providers
jest.mock('@/lib/env', () => ({
  env: {
    ANTHROPIC_API_KEY: 'test-key',
    OPENAI_API_KEY: 'test-key',
    GEMINI_API_KEY: 'test-key',
  },
  hasAnthropicAI: () => true,
  hasOpenAI: () => true,
  hasGemini: () => true,
  hasPerplexity: () => false,
  hasVoyageAPI: () => false,
  hasAnyAI: () => true,
  isProduction: () => false,
  requireFeatureEnv: () => {},
}))

jest.mock('@/lib/ai/ai-guard', () => ({
  isAIAvailable: () => true,
  AI_TIMEOUT_MS: { critical: 0, enrichment: 7000, background: 30000, optional: 15000 },
}))

import { _testExports, getProviderHealthStatus } from '@/lib/ai/providers'

const { recordProviderSuccess, recordProviderFailure, isProviderPenalized, providerStats } = _testExports

function clearStats() {
  for (const key of Object.keys(providerStats)) {
    delete providerStats[key]
  }
}

describe('Adaptive provider fallback', () => {
  beforeEach(() => {
    clearStats()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('provider is not penalized by default', () => {
    expect(isProviderPenalized('anthropic')).toBe(false)
    expect(isProviderPenalized('openai')).toBe(false)
  })

  it('single failure penalizes for BASE_PENALTY (1 min)', () => {
    recordProviderFailure('anthropic')
    expect(isProviderPenalized('anthropic')).toBe(true)

    // After 59s, still penalized
    jest.advanceTimersByTime(59_000)
    expect(isProviderPenalized('anthropic')).toBe(true)

    // After 61s, penalty expired
    jest.advanceTimersByTime(2_000)
    expect(isProviderPenalized('anthropic')).toBe(false)
  })

  it('consecutive failures escalate penalty exponentially', () => {
    // 1st failure: 1 min
    recordProviderFailure('openai')
    expect(isProviderPenalized('openai')).toBe(true)

    // 2nd failure: 2 min
    jest.advanceTimersByTime(61_000)
    recordProviderFailure('openai')

    jest.advanceTimersByTime(100_000) // 1m40s — still within 2min penalty
    expect(isProviderPenalized('openai')).toBe(true)

    jest.advanceTimersByTime(21_000) // 2m01s total — penalty expired
    expect(isProviderPenalized('openai')).toBe(false)

    // 3rd failure: 4 min
    recordProviderFailure('openai')
    jest.advanceTimersByTime(200_000) // 3m20s — still penalized
    expect(isProviderPenalized('openai')).toBe(true)

    jest.advanceTimersByTime(41_000) // 4m01s — expired
    expect(isProviderPenalized('openai')).toBe(false)
  })

  it('penalty caps at MAX_PENALTY (1 hour)', () => {
    // Simulate 20 consecutive failures
    for (let i = 0; i < 20; i++) {
      recordProviderFailure('gemini')
    }

    // penalty = min(60000 * 2^19, 3600000) = 3600000 (1 hour)
    jest.advanceTimersByTime(3_599_000) // 59m59s — still penalized
    expect(isProviderPenalized('gemini')).toBe(true)

    jest.advanceTimersByTime(2_000) // 1h01s — expired
    expect(isProviderPenalized('gemini')).toBe(false)
  })

  it('success resets consecutive failure counter', () => {
    recordProviderFailure('anthropic')
    recordProviderFailure('anthropic')
    recordProviderFailure('anthropic')

    // After success, consecutive resets to 0
    recordProviderSuccess('anthropic', 200)

    const stats = getProviderHealthStatus()
    expect(stats.anthropic.consecutiveFailures).toBe(0)
    expect(stats.anthropic.successes).toBe(1)
    expect(stats.anthropic.failures).toBe(3)
  })

  it('success records latency with exponential moving average', () => {
    recordProviderSuccess('anthropic', 100)
    let stats = getProviderHealthStatus()
    expect(stats.anthropic.avgLatencyMs).toBe(100)

    recordProviderSuccess('anthropic', 500)
    stats = getProviderHealthStatus()
    // EMA: 100 * 0.8 + 500 * 0.2 = 180
    expect(stats.anthropic.avgLatencyMs).toBe(180)
  })

  it('different providers are tracked independently', () => {
    recordProviderFailure('anthropic')
    recordProviderSuccess('openai', 100)

    expect(isProviderPenalized('anthropic')).toBe(true)
    expect(isProviderPenalized('openai')).toBe(false)
  })
})
