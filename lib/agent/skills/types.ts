/**
 * LiftGO Agent Skills — Type Definitions
 *
 * Core types for the skills system: skill definitions, execution state,
 * question/answer flows, and results.
 */

import type { AgentContext } from '../context'

// =============================================================================
// Skill Definition
// =============================================================================

export interface ClarificationQuestion {
  /** Unique field name — key in collectedData */
  field: string
  /** Question text shown to the user (Slovenian) */
  question: string
  /** Whether the question must be answered; if false, empty answer is accepted */
  required: boolean
  /** Optional validator — return true to accept, string to show as error message */
  validator?: (answer: string) => true | string
}

export interface SkillDefinition {
  /** Unique identifier, kebab-case */
  name: string
  /** Short description (for logging/debugging) */
  description: string
  /** How to detect that this skill should handle a message */
  triggers: {
    keywords: string[]
    /** Optional regex applied to lower-cased message before keyword check */
    pattern?: RegExp
  }
  /** Ordered list of clarifying questions before execution */
  questions: ClarificationQuestion[]
  /** Called once all required data is collected */
  execute: (
    data: Record<string, string>,
    context: AgentContext
  ) => Promise<SkillResult>
}

// =============================================================================
// Skill Execution State
// =============================================================================

export interface SkillState {
  skillName: string
  /** Index into SkillDefinition.questions for the next unanswered question */
  questionIndex: number
  /** Answers keyed by ClarificationQuestion.field */
  collectedData: Record<string, string>
  completed: boolean
  startedAt: number
}

// =============================================================================
// Skill Result
// =============================================================================

export interface SkillResult {
  success: boolean
  /** Human-readable message to display (Slovenian) */
  message: string
  /** True when the skill needs one more answer before it can execute */
  clarificationNeeded?: boolean
  /** The next question to ask the user */
  nextQuestion?: string
  /** If the skill wants to execute a tool, provide it here */
  toolCall?: {
    tool: string
    params: Record<string, unknown>
  }
  /** Optional structured output for downstream processing */
  data?: Record<string, unknown>
}
