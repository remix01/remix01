/**
 * Agent Registry — Initializes and registers all specialized agents.
 * 
 * Called once at app startup to wire up the entire multi-agent system.
 * Each agent is registered with the MessageBus and can then receive messages.
 */

import { messageBus } from './MessageBus'

/**
 * Initialize all agents and register them with the MessageBus.
 * 
 * This function is called once during app startup (in the root layout or main page).
 * It lazily imports each agent to avoid circular dependencies.
 * 
 * Agents initialized:
 * - OrchestratorAgent: Central coordinator, routes user intents to domain agents
 * - InquiryAgent: Handles inquiry/request creation and retrieval
 * - EscrowAgent: Manages payment escrows, capture, release, refund
 * - DisputeAgent: Handles dispute creation and resolution
 * - NotifyAgent: Sends notifications and broadcasts events
 */
export async function initializeAgents(): Promise<void> {
  try {
    // Lazy load agents to avoid circular dependencies
    const { OrchestratorAgent } = await import('../orchestrator-agent/OrchestratorAgent')
    const { InquiryAgent } = await import('../inquiry-agent/InquiryAgent')
    const { EscrowAgent } = await import('../escrow-agent/EscrowAgent')
    const { DisputeAgent } = await import('../dispute-agent/DisputeAgent')
    const { NotifyAgent } = await import('../notify-agent/NotifyAgent')

    // Register each agent with the bus
    messageBus.register(new OrchestratorAgent())
    messageBus.register(new InquiryAgent())
    messageBus.register(new EscrowAgent())
    messageBus.register(new DisputeAgent())
    messageBus.register(new NotifyAgent())

    console.log('[AgentRegistry] Multi-agent system initialized')
    console.log('[AgentRegistry] Registered agents:', messageBus.getRegistered().join(', '))

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[AgentRegistry] Failed to initialize agents:', msg)
    throw new Error(`Agent initialization failed: ${msg}`)
  }
}

/**
 * Check if agents are already initialized.
 * Useful to avoid double-initialization.
 */
export function agentsInitialized(): boolean {
  const registered = messageBus.getRegistered()
  // All 5 agents should be registered
  return registered.length === 5
}
