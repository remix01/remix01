import { initializeAgents, agentsInitialized } from './base/AgentRegistry'
import { messageBus } from './base/MessageBus'

/**
 * Ensures agents are initialized exactly once per process.
 * Safe to await on every request — skips init if already done.
 *
 * NOTE: In Next.js serverless, each cold start re-initializes.
 * initializeAgents() is lightweight (only registers in-memory handlers)
 * so per-cold-start init is acceptable.
 */
export async function ensureAgentsInitialized(): Promise<void> {
  if (agentsInitialized()) return

  await initializeAgents()
  console.log('[Agents] Initialized all 6 agents')
  console.log('[Agents] Registered agents:', messageBus.getRegistered().join(', '))
}
