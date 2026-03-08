/**
 * BaseAgent — Abstract base class for all specialized agents.
 * 
 * Each agent handles a specific domain and implements the abstract methods.
 * Agents log via agentLogger and trace via tracer for full observability.
 */

import { agentLogger } from '@/lib/observability'
import { tracer, type Span } from '@/lib/observability/tracing'
import type { AgentType, AgentMessage, AgentResponse } from './types'

export abstract class BaseAgent {
  /**
   * Agent type identifier.
   * Must match one of: 'orchestrator', 'inquiry', 'escrow', 'dispute', 'notify'
   */
  abstract type: AgentType

  /**
   * List of action names this agent can handle.
   * e.g., ['createInquiry', 'listInquiries', 'updateInquiry']
   */
  abstract handledActions: string[]

  /**
   * Core handler — processes a message and returns a response.
   * Implemented by each specialized agent subclass.
   * 
   * @param message - The incoming agent message
   * @returns Response with success/error and duration
   */
  abstract handle(message: AgentMessage): Promise<AgentResponse>

  /**
   * Check if this agent can handle the given action.
   * Used by MessageBus to route messages to the correct agent.
   */
  canHandle(action: string): boolean {
    return this.handledActions.includes(action)
  }

  /**
   * Log an event via agentLogger.
   * Provides non-blocking, sanitized logging for all agent activity.
   */
  protected log(
    event: string,
    details?: Record<string, unknown>
  ): void {
    try {
      agentLogger.log('info', event as any, details)
    } catch (error) {
      console.error('[BaseAgent] Logging failed:', error)
    }
  }

  /**
   * Start a distributed trace span.
   * Used to measure and observe the performance of operations within this agent.
   * 
   * @param operation - Name of the operation being traced
   * @returns A Span object that you must call .end() on when done
   */
  protected trace(operation: string): Span {
    return tracer.startTrace(`${this.type}.${operation}`)
  }

  /**
   * Format a log entry with agent context.
   * Useful for consistent structured logging across all agents.
   */
  protected formatLog(
    action: string,
    message: AgentMessage,
    result: { success: boolean; error?: string }
  ): Record<string, unknown> {
    return {
      agent: this.type,
      action,
      sessionId: message.sessionId,
      userId: message.userId,
      correlationId: message.correlationId,
      ...result,
    }
  }
}
