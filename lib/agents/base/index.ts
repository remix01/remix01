/**
 * Multi-Agent System Base Infrastructure
 * 
 * Exports the core types and classes for building the multi-agent system.
 * Each specialized agent extends BaseAgent and registers with the MessageBus.
 */

export { BaseAgent } from './BaseAgent'
export { MessageBus, messageBus, AgentNotRegisteredError } from './MessageBus'
export { initializeAgents, agentsInitialized } from './AgentRegistry'

export type { AgentType, MessageType, Priority, AgentMessage, AgentResponse } from './types'
