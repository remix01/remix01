/**
 * MessageBus — Central routing hub for inter-agent communication.
 * 
 * Enforces the rule: agents NEVER communicate directly.
 * All communication flows through this bus, which:
 * - Routes messages to the correct agent
 * - Logs all messages via agentLogger
 * - Traces all operations via tracer
 * - Ensures correlation IDs link requests to responses
 */

import { v4 as uuidv4 } from 'uuid'
import { agentLogger } from '@/lib/observability'
import { tracer } from '@/lib/observability/tracing'
import { BaseAgent } from './BaseAgent'
import type { AgentType, AgentMessage, AgentResponse } from './types'

/**
 * Error thrown when sending to an unregistered agent.
 */
export class AgentNotRegisteredError extends Error {
  constructor(agentType: AgentType) {
    super(`Agent type '${agentType}' is not registered`)
    this.name = 'AgentNotRegisteredError'
  }
}

/**
 * MessageBus — Routes messages between agents.
 * Singleton instance used throughout the application.
 */
export class MessageBus {
  private handlers: Map<AgentType, BaseAgent> = new Map()

  /**
   * Register an agent to receive messages.
   * Called during app initialization via AgentRegistry.initializeAgents()
   */
  register(agent: BaseAgent): void {
    if (this.handlers.has(agent.type)) {
      console.warn(`[MessageBus] Agent '${agent.type}' already registered, overwriting`)
    }
    this.handlers.set(agent.type, agent)
    console.log(`[MessageBus] Registered agent: ${agent.type}`)
  }

  /**
   * Send a message to a specific agent.
   * 
   * @param message - The message to send (must include correlationId)
   * @returns Response from the handler agent
   * @throws AgentNotRegisteredError if no agent registered for message.to
   */
  async send(message: AgentMessage): Promise<AgentResponse> {
    const startTime = Date.now()
    const span = tracer.startTrace(`messageBus.send`)

    try {
      // Validate recipient is registered
      const handler = this.handlers.get(message.to)
      if (!handler) {
        throw new AgentNotRegisteredError(message.to)
      }

      // Check if handler can process this action
      if (!handler.canHandle(message.action)) {
        const error = `Agent '${message.to}' cannot handle action '${message.action}'`
        console.warn(`[MessageBus] ${error}`)
        
        span.attributes['error'] = error
        span.status = 'error'

        return {
          success: false,
          error,
          handledBy: message.to,
          durationMs: Date.now() - startTime,
        }
      }

      // Log incoming message
      agentLogger.log('info', 'message_received', {
        from: message.from,
        to: message.to,
        action: message.action,
        priority: message.priority,
        correlationId: message.correlationId,
      })

      // Dispatch to handler
      const response = await handler.handle(message)

      // Log response
      agentLogger.log(response.success ? 'info' : 'error', 'message_processed', {
        handledBy: response.handledBy,
        action: message.action,
        success: response.success,
        durationMs: response.durationMs,
        correlationId: message.correlationId,
      })

      span.attributes['success'] = response.success
      span.attributes['durationMs'] = response.durationMs

      return response

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      
      agentLogger.log('error', 'message_failed', {
        to: message.to,
        action: message.action,
        error: errorMsg,
        correlationId: message.correlationId,
      })

      span.attributes['error'] = errorMsg
      span.status = 'error'

      throw error

    } finally {
      span.endTime = Date.now()
      tracer.export(span).catch(err => {
        console.error('[MessageBus] Trace export failed:', err)
      })
    }
  }

  /**
   * Broadcast an event to all registered agents.
   * Used for system-wide events like 'escrow_released'.
   * 
   * @param from - Originating agent
   * @param event - Event name
   * @param payload - Event data
   * @param sessionId - Related session
   * @param userId - Related user
   */
  async broadcast(
    from: AgentType,
    event: string,
    payload: Record<string, unknown>,
    sessionId: string,
    userId: string
  ): Promise<void> {
    const message: AgentMessage = {
      id: uuidv4(),
      from,
      to: 'notify', // Broadcasts go to notify agent for now
      type: 'event',
      action: event,
      payload,
      correlationId: `broadcast-${Date.now()}`,
      sessionId,
      userId,
      timestamp: Date.now(),
      priority: 'normal',
    }

    agentLogger.log('info', 'event_broadcast', {
      from,
      event,
      affectedUsers: 1,
    })

    // Fire and forget — don't await
    this.send(message).catch(error => {
      console.error(`[MessageBus] Broadcast failed: ${error.message}`)
    })
  }

  /**
   * Get list of registered agent types.
   * Useful for health checks and debugging.
   */
  getRegistered(): AgentType[] {
    return Array.from(this.handlers.keys())
  }

  /**
   * Check if an agent type is registered.
   */
  isRegistered(agentType: AgentType): boolean {
    return this.handlers.has(agentType)
  }
}

/**
 * Global MessageBus singleton.
 * Used by all agents and the app to communicate.
 */
export const messageBus = new MessageBus()
