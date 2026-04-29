const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('Agent routes use shared access policy (progressive migration)', () => {
  const dynamicRoute = read('app/api/agent/[agentType]/route.ts')
  const materialsRoute = read('app/api/agent/materials/route.ts')
  const jobSummaryRoute = read('app/api/agent/job-summary/route.ts')
  const quoteRoute = read('app/api/agent/quote-generator/route.ts')
  const chatRoute = read('app/api/agent/chat/route.ts')
  const matchRoute = read('app/api/agent/match/route.ts')

  it('uses shared route access policy for tier checks + daily limits', () => {
    for (const source of [dynamicRoute, materialsRoute, jobSummaryRoute, quoteRoute, chatRoute]) {
      expect(source).toMatch(/loadAiUsageProfile/)
      expect(source).toMatch(/normalizeDailyUsageWindow/)
      expect(source).toMatch(/incrementDailyUsage/)
    }

    for (const source of [dynamicRoute, materialsRoute, jobSummaryRoute, quoteRoute]) {
      expect(source).toMatch(/evaluateAgentTierAccess/) // staged migration for agent-specific routes
    }
  })

  it('keeps unauthorized shape', () => {
    expect(dynamicRoute).toMatch(/fail\('Nepooblaščen dostop\.', 401, 'UNAUTHORIZED'\)/)
    expect(chatRoute).toMatch(/fail\('Nepooblaščen dostop\.', 401, 'UNAUTHORIZED'\)/)

    expect(materialsRoute).toMatch(/status:\s*401/)
    expect(jobSummaryRoute).toMatch(/status:\s*401/)
    expect(quoteRoute).toMatch(/status:\s*401/)
  })

  it('keeps tier denied error shape (canonical on /[agentType], legacy elsewhere)', () => {
    expect(dynamicRoute).toMatch(/fail\([\s\S]*403,[\s\S]*'FORBIDDEN'/)
    expect(dynamicRoute).toMatch(/upgrade_required/) // details payload retained

    expect(materialsRoute).toMatch(/upgrade_required:\s*true/)
    expect(quoteRoute).toMatch(/upgrade_required:\s*true/)
  })

  it('keeps daily limit exceeded behavior', () => {
    expect(dynamicRoute).toMatch(/'LIMIT_REACHED'/)
    expect(dynamicRoute).toMatch(/limit_reached:\s*true/)

    expect(materialsRoute).toMatch(/limit_reached:\s*true/)
    expect(jobSummaryRoute).toMatch(/limit_reached:\s*true/)
    expect(quoteRoute).toMatch(/limit_reached:\s*true/)
    expect(chatRoute).toMatch(/'LIMIT_REACHED'/)
  })

  it('routes usage logging through shared helper in success path', () => {
    for (const source of [dynamicRoute, materialsRoute, jobSummaryRoute, quoteRoute, chatRoute]) {
      expect(source).toMatch(/logAgentUsage\(/)
    }
  })

  it('routes guardrails through shared helper for match endpoint', () => {
    expect(matchRoute).toMatch(/runRouteGuardrails\(/)
    expect(matchRoute).toMatch(/isStructuredError/) // preserved error mapping
  })
})

describe('Tier matrix remains unchanged (free/basic/pro equivalent -> start/pro/elite)', () => {
  const aiRouter = read('lib/agents/ai-router.ts')

  it('preserves configured limits and does not mutate billing/tiers in this change', () => {
    expect(aiRouter).toMatch(/start:\s*\{[\s\S]*general_chat:\s*5/)
    expect(aiRouter).toMatch(/pro:\s*\{[\s\S]*general_chat:\s*100/)
    expect(aiRouter).toMatch(/elite:\s*\{[\s\S]*general_chat:\s*300/)
  })
})
