const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

const POLICY = 'lib/access-policy.ts'
const PLANS = 'lib/plans.ts'
const CRM_SERVICE = 'lib/partner/crm/service.ts'
const INSIGHTS_ROUTE = 'app/api/partner/insights/route.ts'
const GENERATE_OFFER_ROUTE = 'app/api/partner/generate-offer/route.ts'
const TODO_DOC = 'docs/access-policy-todo.md'

const policySource = read(POLICY)
const plansSource = read(PLANS)
const crmServiceSource = read(CRM_SERVICE)
const insightsRouteSource = read(INSIGHTS_ROUTE)
const generateOfferRouteSource = read(GENERATE_OFFER_ROUTE)
const todoSource = read(TODO_DOC)

describe('Access policy canonicalization contract', () => {
  it('uses canonical plans module (no pricing/commission duplication)', () => {
    expect(policySource).toMatch(/from ['"]@\/lib\/plans['"]/)
    expect(policySource).toMatch(/PLANS\[tier\]\.commission/)
    expect(plansSource).toMatch(/STRIPE_PRODUCTS/) // source of truth remains plans.ts -> stripe config
  })

  it('feature access by plan is represented through canAccessFeature()', () => {
    expect(policySource).toMatch(/export function canAccessFeature/)
    expect(policySource).toMatch(/tierHasFeature\(tier, feature\)/)
  })

  it('quota limit policy is centralized and keeps finite/infinite semantics', () => {
    expect(policySource).toMatch(/export function getDailyAiQuota/)
    expect(policySource).toMatch(/Number\.isFinite\(limit\) \? limit : null/)
    expect(policySource).toMatch(/export function evaluateDailyAiQuota/)
    expect(policySource).toMatch(/allowed: usedToday < limit/)
  })

  it('commission lookup is centralized through getPlanCommission()', () => {
    expect(policySource).toMatch(/export function getPlanCommission/)
    expect(policySource).toMatch(/return PLANS\[tier\]\.commission/)
  })

  it('no-subscription defaults to start tier via resolvePartnerTier()', () => {
    expect(policySource).toMatch(/export function resolvePartnerTier/)
    expect(policySource).toMatch(/return normalizeTier\(subscriptionTier\)/)
  })

  it('migrates 2-3 safe usages to canonical module (CRM, Insights, Generate Offer)', () => {
    expect(crmServiceSource).toMatch(/from ['"]@\/lib\/access-policy['"]/)
    expect(crmServiceSource).toMatch(/canAccessFeature\(profile\?\.subscription_tier, 'crm'\)/)

    expect(insightsRouteSource).toMatch(/from ['"]@\/lib\/access-policy['"]/)
    expect(insightsRouteSource).toMatch(/canAccessFeature\(profile\?\.subscription_tier, "insights"\)/)

    expect(generateOfferRouteSource).toMatch(/from ['"]@\/lib\/access-policy['"]/)
    expect(generateOfferRouteSource).toMatch(/canAccessFeature\(\s*obrtnikProfile\.subscription_tier,\s*"offerGenerator"/)
  })

  it('unauthorized checks remain explicit on migrated routes', () => {
    expect(insightsRouteSource).toMatch(/if \(!user\) return fail\("UNAUTHORIZED", "Unauthorized", 401\)/)
    expect(generateOfferRouteSource).toMatch(/if \(!user \|\| authError\) \{\s*return fail\("UNAUTHORIZED", "Neoverjeni", 401\)/)
  })

  it('TODO list exists for remaining duplicated access checks', () => {
    expect(todoSource).toMatch(/Access policy consolidation TODO/)
    expect(todoSource).toMatch(/lib\/ai\/orchestrator\.ts/)
    expect(todoSource).toMatch(/lib\/ai\/patterns\/agent-router\.ts/)
  })
})
