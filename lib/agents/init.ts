import { initializeAgents } from './base/AgentRegistry'
import { messageBus } from './base/MessageBus'

let initialized = false

/**
 * Ensures agents are initialized exactly once at app startup.
 * Safe to call multiple times — will only initialize on first call.
 */
export function ensureAgentsInitialized() {
  if (!initialized) {
    initializeAgents()
    initialized = true
    console.log('[Agents] Initialized all 6 agents')
    console.log('[Agents] Registered agents:', messageBus.getRegistered().join(', '))
  }
}
