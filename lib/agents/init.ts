import { initializeAgents } from './base/AgentRegistry'
import { messageBus } from './base/MessageBus'

let initialized = false
let initPromise: Promise<void> | null = null

/**
 * Ensures agents are initialized exactly once at app startup.
 * Safe to call multiple times — will only initialize on first call.
 */
export async function ensureAgentsInitialized(): Promise<void> {
  if (initialized) return
  if (!initPromise) {
    initPromise = initializeAgents()
      .then(() => {
        initialized = true
        console.log('[Agents] Initialized core agents')
        console.log('[Agents] Registered agents:', messageBus.getRegistered().join(', '))
      })
      .catch((error) => {
        initPromise = null
        throw error
      })
  }
  await initPromise
}
