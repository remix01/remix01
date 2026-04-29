import { describe, it, expect } from '@jest/globals'
import {
  isAgentAccessible,
  getAgentDailyLimit,
  AGENT_META,
  AGENT_DAILY_LIMITS,
  type AIAgentType,
} from '@/lib/agents/ai-router'

// ─── Agent classification ─────────────────────────────────────────────────────

const TIER_RESTRICTED_AGENTS: AIAgentType[] = [
  'video_diagnosis',
  'materials_agent',
  'offer_writing',
  'profile_optimization',
]

const FREE_AGENTS: AIAgentType[] = [
  'general_chat',
  'work_description',
  'offer_comparison',
  'scheduling_assistant',
  'quote_generator',
  'job_summary',
]

const ALL_AGENTS: AIAgentType[] = [...FREE_AGENTS, ...TIER_RESTRICTED_AGENTS]
const ALL_TIERS = ['start', 'pro', 'elite', 'enterprise']

// ─── isAgentAccessible ────────────────────────────────────────────────────────

describe('isAgentAccessible', () => {
  describe('free agents — accessible to every tier', () => {
    for (const agent of FREE_AGENTS) {
      for (const tier of ALL_TIERS) {
        it(`${agent} is accessible on ${tier}`, () => {
          expect(isAgentAccessible(agent, tier)).toBe(true)
        })
      }
    }
  })

  describe('tier-restricted agents — blocked on start', () => {
    for (const agent of TIER_RESTRICTED_AGENTS) {
      it(`${agent} is NOT accessible on start`, () => {
        expect(isAgentAccessible(agent, 'start')).toBe(false)
      })
    }
  })

  describe('tier-restricted agents — accessible on pro and enterprise', () => {
    for (const agent of TIER_RESTRICTED_AGENTS) {
      it(`${agent} is accessible on pro`, () => {
        expect(isAgentAccessible(agent, 'pro')).toBe(true)
      })

      it(`${agent} is accessible on enterprise`, () => {
        expect(isAgentAccessible(agent, 'enterprise')).toBe(true)
      })
    }
  })

  describe('tier-restricted agents — blocked on elite (not pro/enterprise)', () => {
    for (const agent of TIER_RESTRICTED_AGENTS) {
      it(`${agent} is NOT accessible on elite`, () => {
        // elite is above start but NOT in the allowed set for restricted agents
        expect(isAgentAccessible(agent, 'elite')).toBe(false)
      })
    }
  })

  it('returns true for any free agent with an unknown tier', () => {
    expect(isAgentAccessible('general_chat', 'unknown_tier')).toBe(true)
  })

  it('returns false for a restricted agent with an unknown tier', () => {
    expect(isAgentAccessible('video_diagnosis', 'unknown_tier')).toBe(false)
  })
})

// ─── getAgentDailyLimit ───────────────────────────────────────────────────────

describe('getAgentDailyLimit', () => {
  describe('start tier limits match specification', () => {
    it('general_chat: 5', () => {
      expect(getAgentDailyLimit('general_chat', 'start')).toBe(5)
    })
    it('work_description: 3', () => {
      expect(getAgentDailyLimit('work_description', 'start')).toBe(3)
    })
    it('offer_comparison: 2', () => {
      expect(getAgentDailyLimit('offer_comparison', 'start')).toBe(2)
    })
    it('video_diagnosis: 0 (blocked)', () => {
      expect(getAgentDailyLimit('video_diagnosis', 'start')).toBe(0)
    })
    it('materials_agent: 0 (blocked)', () => {
      expect(getAgentDailyLimit('materials_agent', 'start')).toBe(0)
    })
    it('offer_writing: 0 (blocked)', () => {
      expect(getAgentDailyLimit('offer_writing', 'start')).toBe(0)
    })
    it('profile_optimization: 0 (blocked)', () => {
      expect(getAgentDailyLimit('profile_optimization', 'start')).toBe(0)
    })
  })

  describe('pro tier limits match specification', () => {
    it('general_chat: 100', () => {
      expect(getAgentDailyLimit('general_chat', 'pro')).toBe(100)
    })
    it('video_diagnosis: 10', () => {
      expect(getAgentDailyLimit('video_diagnosis', 'pro')).toBe(10)
    })
    it('quote_generator: 30', () => {
      expect(getAgentDailyLimit('quote_generator', 'pro')).toBe(30)
    })
    it('materials_agent: 15', () => {
      expect(getAgentDailyLimit('materials_agent', 'pro')).toBe(15)
    })
  })

  describe('enterprise tier — all agents are Infinity', () => {
    for (const agent of ALL_AGENTS) {
      it(`${agent} has Infinity limit on enterprise`, () => {
        expect(getAgentDailyLimit(agent, 'enterprise')).toBe(Infinity)
      })
    }
  })

  describe('unknown tier falls back to start limits', () => {
    it('returns start-tier limit for unknown tier', () => {
      expect(getAgentDailyLimit('general_chat', 'ghost_tier')).toBe(5)
    })

    it('returns 0 for restricted agent on unknown tier (start fallback)', () => {
      expect(getAgentDailyLimit('video_diagnosis', 'ghost_tier')).toBe(0)
    })
  })

  it('returns 0 for unknown agent type', () => {
    expect(getAgentDailyLimit('nonexistent_agent' as AIAgentType, 'pro')).toBe(0)
  })

  describe('pro tier is strictly higher than start for every agent', () => {
    for (const agent of ALL_AGENTS) {
      it(`${agent}: pro limit ≥ start limit`, () => {
        const proLimit = getAgentDailyLimit(agent, 'pro')
        const startLimit = getAgentDailyLimit(agent, 'start')
        expect(proLimit).toBeGreaterThanOrEqual(startLimit)
      })
    }
  })

  describe('elite tier is strictly higher than pro for every agent', () => {
    for (const agent of ALL_AGENTS) {
      it(`${agent}: elite limit ≥ pro limit`, () => {
        const eliteLimit = getAgentDailyLimit(agent, 'elite')
        const proLimit = getAgentDailyLimit(agent, 'pro')
        expect(eliteLimit).toBeGreaterThanOrEqual(proLimit)
      })
    }
  })
})

// ─── AGENT_DAILY_LIMITS consistency ───────────────────────────────────────────

describe('AGENT_DAILY_LIMITS table consistency', () => {
  it('every tier row contains exactly the known set of agent types', () => {
    for (const tier of ALL_TIERS) {
      const keys = Object.keys(AGENT_DAILY_LIMITS[tier]).sort()
      expect(keys).toEqual([...ALL_AGENTS].sort())
    }
  })

  it('tier-restricted agents have limit=0 on start', () => {
    for (const agent of TIER_RESTRICTED_AGENTS) {
      expect(AGENT_DAILY_LIMITS.start[agent]).toBe(0)
    }
  })

  it('free agents have limit>0 on start', () => {
    for (const agent of FREE_AGENTS) {
      expect(AGENT_DAILY_LIMITS.start[agent]).toBeGreaterThan(0)
    }
  })
})

// ─── AGENT_META consistency ───────────────────────────────────────────────────

describe('AGENT_META consistency', () => {
  it('defines metadata for every known agent type', () => {
    for (const agent of ALL_AGENTS) {
      expect(AGENT_META[agent]).toBeDefined()
    }
  })

  it('tier-restricted agents have tier="pro" in metadata', () => {
    for (const agent of TIER_RESTRICTED_AGENTS) {
      expect(AGENT_META[agent].tier).toBe('pro')
    }
  })

  it('free agents have tier=null in metadata', () => {
    for (const agent of FREE_AGENTS) {
      expect(AGENT_META[agent].tier).toBeNull()
    }
  })

  it('every agent has a non-empty label', () => {
    for (const agent of ALL_AGENTS) {
      expect(AGENT_META[agent].label.length).toBeGreaterThan(0)
    }
  })

  it('every agent has a non-empty icon name', () => {
    for (const agent of ALL_AGENTS) {
      expect(AGENT_META[agent].icon.length).toBeGreaterThan(0)
    }
  })

  it('every agent has at least one role assigned', () => {
    for (const agent of ALL_AGENTS) {
      expect(AGENT_META[agent].roles.length).toBeGreaterThan(0)
    }
  })

  it('narocnik-facing agents are correctly labelled', () => {
    const narocnikAgents: AIAgentType[] = [
      'work_description',
      'offer_comparison',
      'scheduling_assistant',
      'video_diagnosis',
    ]
    for (const agent of narocnikAgents) {
      expect(AGENT_META[agent].roles).toContain('narocnik')
    }
  })

  it('obrtnik-facing agents are correctly labelled', () => {
    const obrtnikAgents: AIAgentType[] = [
      'quote_generator',
      'materials_agent',
      'job_summary',
      'offer_writing',
      'profile_optimization',
    ]
    for (const agent of obrtnikAgents) {
      expect(AGENT_META[agent].roles).toContain('obrtnik')
    }
  })

  it('general_chat is available to both roles', () => {
    expect(AGENT_META.general_chat.roles).toContain('narocnik')
    expect(AGENT_META.general_chat.roles).toContain('obrtnik')
  })

  it('tier-restricted async agents are marked async=true', () => {
    // video_diagnosis and materials_agent are async (heavy computation)
    expect(AGENT_META.video_diagnosis.async).toBe(true)
    expect(AGENT_META.materials_agent.async).toBe(true)
  })
})

// ─── Cross-table invariants ───────────────────────────────────────────────────

describe('cross-table invariants: isAgentAccessible ↔ daily limit', () => {
  it('restricted agents have limit=0 on start (inaccessible tier)', () => {
    for (const agent of TIER_RESTRICTED_AGENTS) {
      expect(isAgentAccessible(agent, 'start')).toBe(false)
      expect(getAgentDailyLimit(agent, 'start')).toBe(0)
    }
  })

  it('all agents are accessible and have limit>0 on enterprise', () => {
    for (const agent of ALL_AGENTS) {
      expect(isAgentAccessible(agent, 'enterprise')).toBe(true)
      expect(getAgentDailyLimit(agent, 'enterprise')).toBeGreaterThan(0)
    }
  })

  it('all agents are accessible and have limit>0 on pro', () => {
    for (const agent of ALL_AGENTS) {
      expect(isAgentAccessible(agent, 'pro')).toBe(true)
      expect(getAgentDailyLimit(agent, 'pro')).toBeGreaterThan(0)
    }
  })

  it('free agents are accessible with limit>0 on every tier', () => {
    for (const agent of FREE_AGENTS) {
      for (const tier of ALL_TIERS) {
        expect(isAgentAccessible(agent, tier)).toBe(true)
        expect(getAgentDailyLimit(agent, tier)).toBeGreaterThan(0)
      }
    }
  })
})
