/**
 * Skills System — Unit Tests
 *
 * Tests cover:
 *  - Skill trigger detection
 *  - Multi-turn Q&A state machine (happy path + validation errors)
 *  - Execution outputs
 *  - Edge cases: unknown message, reset, optional fields
 */

import { describe, it, expect, beforeEach } from '@jest/globals'

// Import core skills so they self-register
import '@/lib/agent/skills/core/understanding-request'
import '@/lib/agent/skills/core/matching-craftsmen'
import '@/lib/agent/skills/core/managing-escrow'

import { skillExecutor, skillRegistry } from '@/lib/agent/skills/executor'
import type { AgentContext } from '@/lib/agent/context'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(sessionId: string): AgentContext {
  return {
    userId: 'test-user-1',
    userEmail: 'test@liftgo.si',
    userRole: 'user',
    sessionId,
    timestamp: new Date(),
    messages: [],
    activeResourceIds: {},
  }
}

let sessionCounter = 0
function freshSession(): { sessionId: string; ctx: AgentContext } {
  const sessionId = `test-session-${++sessionCounter}`
  return { sessionId, ctx: makeContext(sessionId) }
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

describe('skillRegistry', () => {
  it('lists all 3 registered skills', () => {
    const names = skillRegistry.list()
    expect(names).toContain('understanding-request')
    expect(names).toContain('matching-craftsmen')
    expect(names).toContain('managing-escrow')
  })

  it('does not register duplicate skill names', () => {
    const namesBefore = skillRegistry.list()
    const unique = new Set(namesBefore)
    // Each name should appear exactly once
    expect(namesBefore.length).toBe(unique.size)
  })

  it('finds understanding-request skill by keyword "potrebujem"', () => {
    const ctx = makeContext('find-test')
    const skill = skillRegistry.findByTrigger('Potrebujem vodovodarja', ctx)
    expect(skill?.name).toBe('understanding-request')
  })

  it('finds matching-craftsmen skill by keyword "najdi mojstr"', () => {
    const ctx = makeContext('find-test-2')
    const skill = skillRegistry.findByTrigger('Najdi mojstra za moje povpraševanje', ctx)
    expect(skill?.name).toBe('matching-craftsmen')
  })

  it('finds managing-escrow skill by keyword "sprosti plačilo"', () => {
    const ctx = makeContext('find-test-3')
    const skill = skillRegistry.findByTrigger('Sprosti plačilo prosim', ctx)
    expect(skill?.name).toBe('managing-escrow')
  })

  it('returns null for unknown message', () => {
    const ctx = makeContext('find-test-4')
    const skill = skillRegistry.findByTrigger('Kakšno je vreme danes?', ctx)
    expect(skill).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// skillExecutor — no active skill
// ---------------------------------------------------------------------------

describe('skillExecutor — no skill triggered', () => {
  it('returns null for a message that does not match any skill', async () => {
    const { sessionId, ctx } = freshSession()
    const result = await skillExecutor.process(sessionId, 'Živjo, kako si?', ctx)
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// understanding-request — full happy path
// ---------------------------------------------------------------------------

describe('understanding-request skill — happy path', () => {
  it('completes full Q&A flow and returns summary', async () => {
    const { sessionId, ctx } = freshSession()

    // Turn 1: trigger
    const q1 = await skillExecutor.process(sessionId, 'Potrebujem vodovodarja', ctx)
    expect(q1?.clarificationNeeded).toBe(true)
    expect(q1?.message).toContain('Opišite')

    // Turn 2: description
    const q2 = await skillExecutor.process(sessionId, 'Zamenjati pip v kopalnici', ctx)
    expect(q2?.clarificationNeeded).toBe(true)
    expect(q2?.message).toContain('mestu')

    // Turn 3: location
    const q3 = await skillExecutor.process(sessionId, 'Ljubljana', ctx)
    expect(q3?.clarificationNeeded).toBe(true)
    expect(q3?.message).toContain('Kdaj')

    // Turn 4: urgency
    const q4 = await skillExecutor.process(sessionId, '2', ctx)
    expect(q4?.clarificationNeeded).toBe(true)
    expect(q4?.message).toContain('proračun')

    // Turn 5: budget (optional — skip with empty)
    const final = await skillExecutor.process(sessionId, '', ctx)
    expect(final?.success).toBe(true)
    expect(final?.clarificationNeeded).toBeFalsy()
    expect(final?.message).toContain('Ljubljana')
    expect(final?.message).toContain('kmalu')
    expect(final?.data?.location).toBe('Ljubljana')
    expect(final?.data?.urgency).toBe('kmalu')
  })

  it('accepts urgency as text "takoj"', async () => {
    const { sessionId, ctx } = freshSession()
    await skillExecutor.process(sessionId, 'Iščem elektrikarja', ctx)
    await skillExecutor.process(sessionId, 'Popraviti vtičnico', ctx)
    await skillExecutor.process(sessionId, 'Maribor', ctx)
    const q4 = await skillExecutor.process(sessionId, 'takoj', ctx)
    // Should move to budget question, not re-ask urgency
    expect(q4?.message).toContain('proračun')
  })

  it('re-asks on invalid urgency input', async () => {
    const { sessionId, ctx } = freshSession()
    await skillExecutor.process(sessionId, 'Potrebujem slikopleskarstvo', ctx)
    await skillExecutor.process(sessionId, 'Pobarvati sobo', ctx)
    await skillExecutor.process(sessionId, 'Celje', ctx)
    const invalid = await skillExecutor.process(sessionId, 'jutri verjetno', ctx)
    expect(invalid?.success).toBe(false)
    expect(invalid?.clarificationNeeded).toBe(true)
    expect(invalid?.message).toContain('1')
  })

  it('re-asks on too-short description', async () => {
    const { sessionId, ctx } = freshSession()
    await skillExecutor.process(sessionId, 'Potrebujem pomoc', ctx)
    const invalid = await skillExecutor.process(sessionId, 'ok', ctx) // too short
    expect(invalid?.success).toBe(false)
    expect(invalid?.message).toContain('5 znakov')
  })
})

// ---------------------------------------------------------------------------
// managing-escrow skill — happy path
// ---------------------------------------------------------------------------

describe('managing-escrow skill — release flow', () => {
  it('returns releaseEscrow toolCall when user chooses action 1', async () => {
    const { sessionId, ctx } = freshSession()

    // Turn 1: trigger
    const q1 = await skillExecutor.process(sessionId, 'Sprosti plačilo', ctx)
    expect(q1?.clarificationNeeded).toBe(true)
    expect(q1?.message).toContain('escrow')

    // Turn 2: escrowId
    const q2 = await skillExecutor.process(sessionId, 'escrow-abc-123', ctx)
    expect(q2?.clarificationNeeded).toBe(true)
    expect(q2?.message).toContain('1')

    // Turn 3: action
    const final = await skillExecutor.process(sessionId, '1', ctx)
    expect(final?.success).toBe(true)
    expect(final?.toolCall?.tool).toBe('releaseEscrow')
    expect(final?.toolCall?.params.escrowId).toBe('escrow-abc-123')
  })

  it('returns status message when user chooses action 2', async () => {
    const { sessionId, ctx } = freshSession()
    await skillExecutor.process(sessionId, 'Plačilo status', ctx)
    await skillExecutor.process(sessionId, 'esc-xyz-999', ctx)
    const final = await skillExecutor.process(sessionId, '2', ctx)
    expect(final?.success).toBe(true)
    expect(final?.toolCall).toBeUndefined()
    expect(final?.message).toContain('status')
  })

  it('rejects invalid action input', async () => {
    const { sessionId, ctx } = freshSession()
    await skillExecutor.process(sessionId, 'Escrow plačilo', ctx)
    await skillExecutor.process(sessionId, 'esc-test-1', ctx)
    const invalid = await skillExecutor.process(sessionId, 'ne vem', ctx)
    expect(invalid?.success).toBe(false)
    expect(invalid?.clarificationNeeded).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// skillExecutor — reset
// ---------------------------------------------------------------------------

describe('skillExecutor.reset', () => {
  it('clears active skill mid-flow', async () => {
    const { sessionId, ctx } = freshSession()

    // Start a skill
    await skillExecutor.process(sessionId, 'Potrebujem mojstra', ctx)
    expect(skillExecutor.getState(sessionId)).not.toBeNull()

    // Reset
    skillExecutor.reset(sessionId)
    expect(skillExecutor.getState(sessionId)).toBeNull()

    // Next message should not continue the old skill
    const result = await skillExecutor.process(sessionId, 'Ljubljana', ctx)
    // "Ljubljana" alone does not trigger any skill
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// matching-craftsmen skill — question flow only (no real DB in unit tests)
// ---------------------------------------------------------------------------

describe('matching-craftsmen skill — Q&A flow', () => {
  it('asks for povprasevanjeId on trigger', async () => {
    const { sessionId, ctx } = freshSession()
    const q1 = await skillExecutor.process(sessionId, 'Najdi mojstra za moje povpraševanje', ctx)
    expect(q1?.clarificationNeeded).toBe(true)
    expect(q1?.message).toContain('ID')
  })

  it('rejects empty povprasevanjeId', async () => {
    const { sessionId, ctx } = freshSession()
    await skillExecutor.process(sessionId, 'Primerjaj mojstre', ctx)
    const invalid = await skillExecutor.process(sessionId, '', ctx)
    // Empty required field — re-asks
    expect(invalid?.clarificationNeeded).toBe(true)
  })
})
