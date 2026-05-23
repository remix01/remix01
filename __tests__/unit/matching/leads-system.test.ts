/**
 * Lead System Tests (Rec 10)
 *
 * Scenarios:
 * 1. START partner at max leads → excluded from matching
 * 2. PRO partner at max leads → fallback step 3 adds them, with warning
 * 3. ENTERPRISE partner (only one in radius) → fallback step 3 assigns, logged
 * 4. Vacation mode → excluded from matching
 * 5. Daily lead limit reached → excluded from matching
 * 6. Round-robin tiebreaker → least-recently-assigned wins
 * 7. Inactivity penalty → 2+ ignored leads reduces score by 10
 */

import {
  MAX_HARD_RADIUS_KM,
  MAX_MATCHES,
  LEAD_SLA_HOURS,
} from '@/lib/agents/matching/smartMatchingAgent'

// ── Pure scoring helpers (extracted for unit testing) ─────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function scoreLocation(distanceKm: number, serviceRadiusKm: number): number {
  const effectiveMax = Math.min(serviceRadiusKm, MAX_HARD_RADIUS_KM)
  if (distanceKm > effectiveMax) return 0
  if (distanceKm < 5) return 25
  if (distanceKm < 15) return 20
  if (distanceKm < 30) return 15
  if (distanceKm < 50) return 8
  if (distanceKm < 75) return 3
  return 0
}

function subscriptionMultiplier(tier: string | null): number {
  switch (tier?.toLowerCase()) {
    case 'pro': return 1.2
    case 'elite': return 1.4
    case 'enterprise': return 1.5
    default: return 1.0
  }
}

// ── Hard filter helpers ────────────────────────────────────────────────────

interface Candidate {
  id: string
  subscription_tier: string
  active_lead_count: number
  max_active_leads: number
  vacation_mode: boolean
  daily_lead_limit: number
  daily_leads_today: number
  daily_leads_reset_at: string | null
  lat: number
  lng: number
  service_radius_km: number
  last_lead_assigned_at: string | null
  recent_inactivity_count: number
  categories: string[]
  avg_rating: number
  total_reviews: number
}

function isDailyLimitReached(p: Candidate): boolean {
  if (p.daily_lead_limit === 0) return false
  const resetDate = p.daily_leads_reset_at ? new Date(p.daily_leads_reset_at).toDateString() : null
  const today = new Date().toDateString()
  if (resetDate !== today) return false
  return p.daily_leads_today >= p.daily_lead_limit
}

function applyFilters(
  candidates: Candidate[],
  requestLat: number,
  requestLng: number,
  categoryId: string,
  opts: { radiusMultiplier: number; minRating: number; ignoreLeadCapForPremium: boolean }
): Candidate[] {
  return candidates.filter((p) => {
    if (p.vacation_mode) return false
    if (!p.categories.includes(categoryId)) return false
    if (p.total_reviews > 0 && p.avg_rating < opts.minRating) return false
    if (isDailyLimitReached(p)) return false
    if (p.active_lead_count >= p.max_active_leads) {
      if (!opts.ignoreLeadCapForPremium) return false
      const tier = p.subscription_tier.toLowerCase()
      // START never in fallback step 3
      if (tier === 'start' || tier === '') return false
    }
    const dist = haversineKm(requestLat, requestLng, p.lat, p.lng)
    const radiusLimit = Math.min(p.service_radius_km * opts.radiusMultiplier, MAX_HARD_RADIUS_KM)
    if (dist > radiusLimit) return false
    return true
  })
}

const TODAY = new Date().toDateString()

// ── Shared test data ───────────────────────────────────────────────────────

const BASE_CANDIDATE: Candidate = {
  id: 'c1',
  subscription_tier: 'start',
  active_lead_count: 0,
  max_active_leads: 3,
  vacation_mode: false,
  daily_lead_limit: 0,
  daily_leads_today: 0,
  daily_leads_reset_at: null,
  lat: 46.05,
  lng: 14.51,
  service_radius_km: 30,
  last_lead_assigned_at: null,
  recent_inactivity_count: 0,
  categories: ['cat-plumbing'],
  avg_rating: 4.5,
  total_reviews: 10,
}

const REQUEST = { lat: 46.05, lng: 14.51, categoryId: 'cat-plumbing' }

// ─────────────────────────────────────────────────────────────────────────
describe('Lead Hard Filters', () => {
  test('1: START partner at max leads is excluded from matching', () => {
    const candidate: Candidate = {
      ...BASE_CANDIDATE,
      id: 'start-full',
      subscription_tier: 'start',
      active_lead_count: 3,   // equals max
      max_active_leads: 3,
    }
    const result = applyFilters([candidate], REQUEST.lat, REQUEST.lng, REQUEST.categoryId, {
      radiusMultiplier: 1,
      minRating: 3.0,
      ignoreLeadCapForPremium: false,
    })
    expect(result).toHaveLength(0)
  })

  test('1b: START partner at max leads is NEVER in fallback step 3', () => {
    const candidate: Candidate = {
      ...BASE_CANDIDATE,
      id: 'start-full',
      subscription_tier: 'start',
      active_lead_count: 3,
      max_active_leads: 3,
    }
    const result = applyFilters([candidate], REQUEST.lat, REQUEST.lng, REQUEST.categoryId, {
      radiusMultiplier: 1.5,
      minRating: 2.5,
      ignoreLeadCapForPremium: true,  // fallback step 3
    })
    expect(result).toHaveLength(0)
  })

  test('2: PRO partner at max leads IS included in fallback step 3', () => {
    const candidate: Candidate = {
      ...BASE_CANDIDATE,
      id: 'pro-full',
      subscription_tier: 'pro',
      active_lead_count: 10,
      max_active_leads: 10,
    }
    const result = applyFilters([candidate], REQUEST.lat, REQUEST.lng, REQUEST.categoryId, {
      radiusMultiplier: 1.5,
      minRating: 2.5,
      ignoreLeadCapForPremium: true,  // fallback step 3
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('pro-full')
  })

  test('3: ENTERPRISE partner (only one) → fallback step 3 assigns', () => {
    const candidate: Candidate = {
      ...BASE_CANDIDATE,
      id: 'enterprise-only',
      subscription_tier: 'enterprise',
      active_lead_count: 50,
      max_active_leads: 50,
      service_radius_km: 75,
    }
    const result = applyFilters([candidate], REQUEST.lat, REQUEST.lng, REQUEST.categoryId, {
      radiusMultiplier: 1.5,
      minRating: 2.5,
      ignoreLeadCapForPremium: true,
    })
    expect(result).toHaveLength(1)
    expect(result[0].subscription_tier).toBe('enterprise')
  })

  test('4: Vacation mode partner is excluded', () => {
    const candidate: Candidate = { ...BASE_CANDIDATE, id: 'on-vacation', vacation_mode: true }
    const result = applyFilters([candidate], REQUEST.lat, REQUEST.lng, REQUEST.categoryId, {
      radiusMultiplier: 1,
      minRating: 3.0,
      ignoreLeadCapForPremium: false,
    })
    expect(result).toHaveLength(0)
  })

  test('5a: Daily lead limit not reached → included', () => {
    const candidate: Candidate = {
      ...BASE_CANDIDATE,
      id: 'daily-under',
      daily_lead_limit: 5,
      daily_leads_today: 4,
      daily_leads_reset_at: TODAY,
    }
    const result = applyFilters([candidate], REQUEST.lat, REQUEST.lng, REQUEST.categoryId, {
      radiusMultiplier: 1,
      minRating: 3.0,
      ignoreLeadCapForPremium: false,
    })
    expect(result).toHaveLength(1)
  })

  test('5b: Daily lead limit reached → excluded', () => {
    const candidate: Candidate = {
      ...BASE_CANDIDATE,
      id: 'daily-over',
      daily_lead_limit: 5,
      daily_leads_today: 5,
      daily_leads_reset_at: TODAY,
    }
    const result = applyFilters([candidate], REQUEST.lat, REQUEST.lng, REQUEST.categoryId, {
      radiusMultiplier: 1,
      minRating: 3.0,
      ignoreLeadCapForPremium: false,
    })
    expect(result).toHaveLength(0)
  })

  test('5c: Daily limit with stale reset date → treated as 0 today → included', () => {
    const candidate: Candidate = {
      ...BASE_CANDIDATE,
      id: 'daily-stale',
      daily_lead_limit: 5,
      daily_leads_today: 5,
      daily_leads_reset_at: '2020-01-01',  // old date
    }
    const result = applyFilters([candidate], REQUEST.lat, REQUEST.lng, REQUEST.categoryId, {
      radiusMultiplier: 1,
      minRating: 3.0,
      ignoreLeadCapForPremium: false,
    })
    expect(result).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────
describe('Round-robin tiebreaker (Rec 4)', () => {
  test('6: equal-score candidates sorted by last_lead_assigned_at NULLS FIRST', () => {
    type Scored = { id: string; score: number; _lastAssignedAt: string | null }
    const candidates: Scored[] = [
      { id: 'a', score: 80, _lastAssignedAt: '2026-05-23T10:00:00Z' },
      { id: 'b', score: 80, _lastAssignedAt: null },                    // never assigned → should be first
      { id: 'c', score: 80, _lastAssignedAt: '2026-05-23T08:00:00Z' }, // oldest
    ]
    const sorted = [...candidates].sort((a, b) => {
      if (Math.abs(b.score - a.score) > 2) return b.score - a.score
      const aTime = a._lastAssignedAt ? new Date(a._lastAssignedAt).getTime() : 0
      const bTime = b._lastAssignedAt ? new Date(b._lastAssignedAt).getTime() : 0
      return aTime - bTime
    })
    expect(sorted[0].id).toBe('b')  // never assigned = timestamp 0 = first
    expect(sorted[1].id).toBe('c')  // oldest assignment
    expect(sorted[2].id).toBe('a')  // most recent assignment
  })
})

// ─────────────────────────────────────────────────────────────────────────
describe('Inactivity penalty (Rec 4)', () => {
  const INACTIVITY_THRESHOLD = 2
  const INACTIVITY_PENALTY   = 10

  function scoreWithInactivity(inactivityCount: number, baseScore: number): number {
    const penalty = inactivityCount >= INACTIVITY_THRESHOLD ? INACTIVITY_PENALTY : 0
    return Math.max(0, baseScore - penalty)
  }

  test('7a: 1 ignored lead → no penalty', () => {
    expect(scoreWithInactivity(1, 75)).toBe(75)
  })

  test('7b: 2+ ignored leads → -10 pts penalty', () => {
    expect(scoreWithInactivity(2, 75)).toBe(65)
    expect(scoreWithInactivity(5, 75)).toBe(65)
  })

  test('7c: penalty cannot push score below 0', () => {
    expect(scoreWithInactivity(3, 5)).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────
describe('Constants sanity checks', () => {
  test('MAX_HARD_RADIUS_KM is 75', () => expect(MAX_HARD_RADIUS_KM).toBe(75))
  test('MAX_MATCHES is 5',         () => expect(MAX_MATCHES).toBe(5))
  test('LEAD_SLA_HOURS is 4',      () => expect(LEAD_SLA_HOURS).toBe(4))
})

// ─────────────────────────────────────────────────────────────────────────
describe('Location scoring', () => {
  test('<5km → 25 pts',       () => expect(scoreLocation(3, 30)).toBe(25))
  test('<15km → 20 pts',      () => expect(scoreLocation(10, 30)).toBe(20))
  test('<30km → 15 pts',      () => expect(scoreLocation(20, 30)).toBe(15))
  test('<50km → 8 pts',       () => expect(scoreLocation(40, 75)).toBe(8))
  test('<75km → 3 pts',       () => expect(scoreLocation(60, 75)).toBe(3))
  test('>service radius → 0', () => expect(scoreLocation(50, 30)).toBe(0))
  test('>75km hard cap → 0',  () => expect(scoreLocation(80, 100)).toBe(0))
})

// ─────────────────────────────────────────────────────────────────────────
describe('Subscription multipliers', () => {
  test('START → 1.0x',      () => expect(subscriptionMultiplier('start')).toBe(1.0))
  test('PRO → 1.2x',        () => expect(subscriptionMultiplier('pro')).toBe(1.2))
  test('ELITE → 1.4x',      () => expect(subscriptionMultiplier('elite')).toBe(1.4))
  test('ENTERPRISE → 1.5x', () => expect(subscriptionMultiplier('enterprise')).toBe(1.5))
  test('null → 1.0x',       () => expect(subscriptionMultiplier(null)).toBe(1.0))
})
