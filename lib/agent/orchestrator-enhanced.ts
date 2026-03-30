/**
 * Enhanced Orchestrator — Skills Layer
 *
 * Wraps the base orchestrator with the skills system:
 *
 *   1. Skill detection — check if user message triggers a skill
 *   2. Skill execution — multi-turn Q&A state machine
 *   3. Tool handoff    — if a skill returns a toolCall, route it normally
 *   4. Fallback        — if no skill matches, delegate to base orchestrator
 *
 * Import `orchestrateWithSkills` instead of `orchestrate` at your API layer.
 *
 * @example
 * import { orchestrateWithSkills } from '@/lib/agent/orchestrator-enhanced'
 * const result = await orchestrateWithSkills(message, context)
 */

// Register core skills (side-effect imports — runs skillRegistry.register())
import './skills/core/understanding-request'
import './skills/core/matching-craftsmen'
import './skills/core/managing-escrow'

import { orchestrate, type OrchestratorResponse } from './orchestrator'
import { skillExecutor } from './skills/executor'
import type { AgentContext } from './context'

// =============================================================================
// Types
// =============================================================================

export interface EnhancedOrchestratorResponse extends OrchestratorResponse {
  /** True when a skill handled this turn */
  skillActive?: boolean
  /** Name of the active skill */
  skillName?: string
  /** True when the skill is waiting for another user answer */
  clarificationNeeded?: boolean
}

// =============================================================================
// Main entry point
// =============================================================================

/**
 * Process a user message through the skills layer then the base orchestrator.
 *
 * Flow:
 *  message → skill trigger check
 *    ├─ skill found → Q&A loop → execute → optional toolCall
 *    └─ no skill   → base orchestrator
 */
export async function orchestrateWithSkills(
  userMessage: string,
  context: AgentContext
): Promise<EnhancedOrchestratorResponse> {
  // ── Skills layer ────────────────────────────────────────────────────────
  const skillResult = await skillExecutor.process(
    context.sessionId,
    userMessage,
    context
  )

  if (skillResult) {
    // Skill needs more information — return the next question
    if (skillResult.clarificationNeeded) {
      return {
        success: true,
        message: skillResult.message,
        skillActive: true,
        clarificationNeeded: true,
      }
    }

    // Skill finished and wants to execute a tool — hand off to base orchestrator
    // by synthesising the response as if the LLM selected that tool
    if (skillResult.toolCall) {
      return {
        success: true,
        toolCall: skillResult.toolCall,
        message: skillResult.message,
        skillActive: true,
      }
    }

    // Skill produced a final message without a tool call
    return {
      success: skillResult.success,
      message: skillResult.message,
      skillActive: true,
    }
  }

  // ── Fallback: base orchestrator ─────────────────────────────────────────
  return orchestrate(userMessage, context)
}

// Re-export for convenience
export { skillExecutor, skillRegistry } from './skills/executor'
export type { SkillDefinition, SkillResult, SkillState } from './skills/types'
