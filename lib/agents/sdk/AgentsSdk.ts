import { v4 as uuidv4 } from 'uuid'
import { messageBus } from '../base/MessageBus'
import type { AgentMessage, AgentResponse, AgentType, Priority } from '../base/types'

export interface AgentsSdkSendInput {
  from?: AgentType
  to: AgentType
  action: string
  payload?: Record<string, unknown>
  userId: string
  sessionId: string
  priority?: Priority
  correlationId?: string
}

/**
 * Minimal MAS Agents SDK facade for internal callers.
 */
export class AgentsSdk {
  async send(input: AgentsSdkSendInput): Promise<AgentResponse> {
    const message: AgentMessage = {
      id: uuidv4(),
      from: input.from ?? 'orchestrator',
      to: input.to,
      type: 'request',
      action: input.action,
      payload: input.payload ?? {},
      correlationId: input.correlationId ?? uuidv4(),
      sessionId: input.sessionId,
      userId: input.userId,
      timestamp: Date.now(),
      priority: input.priority ?? 'normal',
    }

    return messageBus.send(message)
  }

  async supervisorHealth(sessionId: string, userId: string): Promise<AgentResponse> {
    return this.send({ to: 'supervisor', action: 'healthCheck', sessionId, userId })
  }
}

export const agentsSdk = new AgentsSdk()
