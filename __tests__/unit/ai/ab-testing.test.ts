import {
  AB_TESTS,
  getActiveTest,
  assignVariant,
  getABAssignment,
  recordABImpression,
  recordABQualityScore,
  getABMetrics,
  _testExports,
} from '@/lib/ai/ab-testing'

const { metricsStore, hashToPercent } = _testExports

describe('A/B Testing Router', () => {
  beforeEach(() => {
    metricsStore.clear()
  })

  it('hashToPercent returns deterministic 0-99 values', () => {
    const pct = hashToPercent('user-123', 'test-abc')
    expect(pct).toBeGreaterThanOrEqual(0)
    expect(pct).toBeLessThan(100)
    expect(hashToPercent('user-123', 'test-abc')).toBe(pct)
  })

  it('same user always gets the same variant', () => {
    const test = AB_TESTS[0]!
    const v1 = assignVariant(test, 'user-abc')
    const v2 = assignVariant(test, 'user-abc')
    expect(v1.id).toBe(v2.id)
  })

  it('different users can get different variants', () => {
    const test = AB_TESTS[0]!
    const variants = new Set<string>()
    for (let i = 0; i < 100; i++) {
      variants.add(assignVariant(test, `user-${i}`).id)
    }
    expect(variants.size).toBeGreaterThan(1)
  })

  it('getActiveTest returns test for matching agent type', () => {
    const test = getActiveTest('offer_comparison')
    expect(test).not.toBeNull()
    expect(test!.agentType).toBe('offer_comparison')
  })

  it('getActiveTest returns null for unknown agent type', () => {
    expect(getActiveTest('nonexistent_agent')).toBeNull()
  })

  it('getABAssignment returns assignment with variant', () => {
    const assignment = getABAssignment('offer_comparison', 'user-xyz')
    expect(assignment).not.toBeNull()
    expect(assignment!.testId).toBe('offer-comparison-model-v1')
    expect(['control', 'sonnet']).toContain(assignment!.variantId)
  })

  it('metrics tracking records impressions', () => {
    recordABImpression('test-1', 'control', 200, true)
    recordABImpression('test-1', 'control', 300, true)
    recordABImpression('test-1', 'control', 500, false)

    const metrics = getABMetrics()
    const m = metrics.find(m => m.testId === 'test-1' && m.variantId === 'control')!
    expect(m.impressions).toBe(3)
    expect(m.avgLatencyMs).toBe(333)
    expect(m.successRate).toBeCloseTo(0.667, 2)
  })

  it('quality scores are tracked independently', () => {
    recordABImpression('test-1', 'v1', 100, true)
    recordABQualityScore('test-1', 'v1', 8)
    recordABQualityScore('test-1', 'v1', 6)

    const metrics = getABMetrics()
    const m = metrics.find(m => m.variantId === 'v1')!
    expect(m.avgQualityScore).toBe(7)
  })

  it('variant weights roughly match traffic distribution', () => {
    const test = AB_TESTS[0]!
    const counts: Record<string, number> = {}
    const N = 1000
    for (let i = 0; i < N; i++) {
      const v = assignVariant(test, `stress-user-${i}`)
      counts[v.id] = (counts[v.id] ?? 0) + 1
    }
    // 70/30 split — allow ±10% tolerance
    const controlPct = (counts['control'] ?? 0) / N
    expect(controlPct).toBeGreaterThan(0.55)
    expect(controlPct).toBeLessThan(0.85)
  })
})
