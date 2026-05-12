import { BaseAgent } from '../base/BaseAgent'
import type { AgentMessage, AgentResponse, AgentType } from '../base/types'
import { messageBus } from '../base/MessageBus'

/**
 * SupervisorAgent — lightweight MAS runtime observer.
 *
 * Responsibilities:
 * - Report registered agent topology
 * - Provide heartbeat-style health checks for the MAS runtime
 */
export class SupervisorAgent extends BaseAgent {
  type: AgentType = 'supervisor'
  handledActions = ['healthCheck', 'topology']

  async handle(message: AgentMessage): Promise<AgentResponse> {
    const start = Date.now()

    try {
      if (message.action === 'topology') {
        return {
          success: true,
          handledBy: this.type,
          durationMs: Date.now() - start,
          data: {
            registeredAgents: messageBus.getRegistered(),
            totalAgents: messageBus.getRegistered().length,
          },
        }
      }

      return {
        success: true,
        handledBy: this.type,
        durationMs: Date.now() - start,
        data: {
          status: 'ok',
          timestamp: new Date().toISOString(),
          registeredAgents: messageBus.getRegistered(),
        },
      }
    } catch (error) {
      return {
        success: false,
        handledBy: this.type,
        durationMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
}
