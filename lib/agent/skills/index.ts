/**
 * LiftGO Agent Skills — Barrel Export
 *
 * Skills:
 *   Shared rules
 *   - matching-rules  — scoring weights + AGENT_INSTRUCTIONS for craftsman matching
 *   - pricing-rules   — hourly rate benchmarks per category with surcharge helpers
 *
 *   Types & execution
 *   - types           — SkillDefinition, SkillResult, SkillState, etc.
 *   - executor        — skillRegistry (register/list/findByTrigger) + skillExecutor (process/reset)
 *
 *   Core skills (auto-register on import)
 *   - core/understanding-request
 *   - core/matching-craftsmen
 *   - core/managing-escrow
 */

// Shared rule constants
export { MATCHING_RULES, AGENT_INSTRUCTIONS } from './matching-rules'
export { PRICING_BENCHMARKS, getPricingForCategory } from './pricing-rules'

// Types
export type {
  ClarificationQuestion,
  SkillDefinition,
  SkillState,
  SkillResult,
} from './types'

// Executor
export { skillRegistry, skillExecutor } from './executor'

// Core skills (importing registers them as a side-effect)
export { understandingRequestSkill } from './core/understanding-request'
export { matchingCraftsmenSkill } from './core/matching-craftsmen'
export { managingEscrowSkill } from './core/managing-escrow'
