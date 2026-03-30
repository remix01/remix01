/**
 * Skill Executor
 *
 * Manages the lifecycle of skill execution across conversation turns:
 *   1. Detect a skill from a user message (trigger matching)
 *   2. Ask clarifying questions one by one (state machine)
 *   3. Execute the skill once all required data is collected
 *   4. Reset state after completion or on demand
 *
 * State is stored in-process (Map). For multi-instance deployments swap to
 * Redis using the same interface — just replace `skillStates`.
 */

import type { AgentContext } from '../context'
import type { SkillDefinition, SkillState, SkillResult } from './types'

// ---------------------------------------------------------------------------
// In-memory state store
// ---------------------------------------------------------------------------
const skillStates = new Map<string, SkillState>()

// ---------------------------------------------------------------------------
// Skill registry
// ---------------------------------------------------------------------------
const registeredSkills: SkillDefinition[] = []

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Register a skill so the executor can trigger it */
function register(skill: SkillDefinition): void {
  if (registeredSkills.some(s => s.name === skill.name)) return // idempotent
  registeredSkills.push(skill)
}

/** Return names of all registered skills */
function list(): string[] {
  return registeredSkills.map(s => s.name)
}

/** Find a skill whose triggers match the given message */
function findByTrigger(
  message: string,
  _context: AgentContext
): SkillDefinition | null {
  const lower = message.toLowerCase()
  for (const skill of registeredSkills) {
    if (skill.triggers.pattern && skill.triggers.pattern.test(lower)) {
      return skill
    }
    if (skill.triggers.keywords.some(kw => lower.includes(kw))) {
      return skill
    }
  }
  return null
}

/** Get current skill state for a session (null if no active skill) */
function getState(sessionId: string): SkillState | null {
  return skillStates.get(sessionId) ?? null
}

/** Clear active skill state for a session */
function reset(sessionId: string): void {
  skillStates.delete(sessionId)
}

/**
 * Process a user message against the skills system.
 *
 * Returns a SkillResult when a skill handled the message, or null when no
 * skill is active/triggered (caller should fall back to the base orchestrator).
 */
async function process(
  sessionId: string,
  message: string,
  context: AgentContext
): Promise<SkillResult | null> {
  let state = skillStates.get(sessionId)

  // ── No active skill — check if this message triggers one ─────────────────
  if (!state) {
    const skill = findByTrigger(message, context)
    if (!skill) return null

    state = {
      skillName: skill.name,
      questionIndex: 0,
      collectedData: {},
      completed: false,
      startedAt: Date.now(),
    }
    skillStates.set(sessionId, state)

    // If the skill has no questions, execute immediately
    if (skill.questions.length === 0) {
      skillStates.delete(sessionId)
      return skill.execute(state.collectedData, context)
    }

    // Ask the first clarifying question
    const firstQ = skill.questions[0]
    return {
      success: true,
      clarificationNeeded: true,
      nextQuestion: firstQ.question,
      message: firstQ.question,
    }
  }

  // ── Active skill — record the user's answer and advance ──────────────────
  const skill = registeredSkills.find(s => s.name === state!.skillName)
  if (!skill) {
    // Orphaned state — clean up and bail
    skillStates.delete(sessionId)
    return null
  }

  const currentQ = skill.questions[state.questionIndex]

  if (currentQ) {
    // Validate the answer if a validator is provided
    if (currentQ.validator) {
      const outcome = currentQ.validator(message)
      if (outcome !== true) {
        // Re-ask the same question with the validation error prepended
        return {
          success: false,
          clarificationNeeded: true,
          nextQuestion: currentQ.question,
          message: `${outcome}\n\n${currentQ.question}`,
        }
      }
    }

    // Accept empty answers for optional questions, skip otherwise validated above
    const isEmpty = message.trim() === ''
    if (!isEmpty || !currentQ.required) {
      state.collectedData[currentQ.field] = message.trim()
      state.questionIndex++
    } else if (currentQ.required) {
      // Required field with empty answer — re-ask
      return {
        success: false,
        clarificationNeeded: true,
        nextQuestion: currentQ.question,
        message: `To polje je obvezno.\n\n${currentQ.question}`,
      }
    }
  }

  // ── Check whether more questions remain ──────────────────────────────────
  const nextQ = skill.questions[state.questionIndex]
  if (nextQ) {
    return {
      success: true,
      clarificationNeeded: true,
      nextQuestion: nextQ.question,
      message: nextQ.question,
    }
  }

  // ── All data collected — execute ─────────────────────────────────────────
  state.completed = true
  skillStates.delete(sessionId)

  return skill.execute(state.collectedData, context)
}

export const skillRegistry = { register, list, findByTrigger, getState, reset }
export const skillExecutor = { process, reset, getState, list: () => skillRegistry.list() }
