/**
 * OrchestratorAgent — The user-facing agent that routes to specialists
 * 
 * This is the ONLY agent that:
 * 1. Calls the LLM (for intent routing and response generation)
 * 2. Talks directly to users
 * 3. Routes requests to specialized agents via MessageBus
 * 
 * It never handles business logic itself — everything is delegated.
 */

import { v4 as uuidv4 } from 'uuid'
import Anthropic from '@anthropic-ai/sdk'
import { BaseAgent } from '../base/BaseAgent'
import type { AgentType, AgentMessage, AgentResponse } from '../base/types'
import { routeIntent, intentMap } from './intentRouter'
import { shortTermMemory, type ConversationState } from '@/lib/agent/memory/shortTerm'
import { loadLongTermMemory, appendActivity } from '@/lib/agent/memory/longTerm'
import { messageBus } from '../base/MessageBus'

const anthropic = new Anthropic()
const INTERACTION_THRESHOLD = 10 // Update long-term memory every N interactions

export class OrchestratorAgent extends BaseAgent {
  type: AgentType = 'orchestrator'
  handledActions = ['processUserMessage']

  async handle(message: AgentMessage): Promise<AgentResponse> {
    const startTime = Date.now()
    const span = this.trace('handle')

    try {
      const userMessage = message.payload.userMessage as string
      if (!userMessage) {
        throw new Error('userMessage is required in payload')
      }

      // 1. Load or create short-term conversation state
      const memState = shortTermMemory.getOrCreate(
        message.sessionId,
        message.userId
      )

      // 2. Add user message to memory
      shortTermMemory.addMessage(message.sessionId, {
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
      })

      // 3. Load long-term memory for context
      const longTermMem = await loadLongTermMemory(message.userId)

      // 4. Route the user's intent
      const intent = await routeIntent(userMessage, memState)

      // 5. If clarification needed, ask the user
      if (intent.action === 'clarify') {
        const clarification = intent.extractedParams.clarification as string
        
        shortTermMemory.addMessage(message.sessionId, {
          role: 'assistant',
          content: clarification,
          timestamp: Date.now(),
        })

        this.log('intent_clarification_needed', {
          confidence: intent.confidence,
          clarification,
        })

        return {
          success: true,
          data: { message: clarification },
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      // 6. Build message for target agent
      const targetAgentMessage = this.buildMessage(intent, message)

      // 7. Send to target agent via MessageBus
      this.log('routing_to_agent', {
        targetAgent: intent.targetAgent,
        action: intent.action,
      })

      const agentResponse = await messageBus.send(targetAgentMessage)

      // 8. Add agent response to memory
      shortTermMemory.addMessage(message.sessionId, {
        role: 'assistant',
        content: agentResponse.data as string ?? JSON.stringify(agentResponse.data),
        timestamp: Date.now(),
        toolResult: {
          success: agentResponse.success,
          data: agentResponse.data,
          error: agentResponse.error,
        },
      })

      // 9. Format response for user
      const userFacingResponse = await this.formatResponse(
        agentResponse,
        longTermMem
      )

      // 10. Record activity in long-term memory (non-blocking)
      if (agentResponse.success) {
        appendActivity(message.userId, {
          tool: intent.action,
          resourceId: (intent.extractedParams.id ?? intent.extractedParams.resourceId) as string | undefined,
          timestamp: Date.now(),
          success: true,
        }).catch(err => {
          console.error('[OrchestratorAgent] Error appending activity:', err)
        })
      }

      // 11. After INTERACTION_THRESHOLD interactions, trigger long-term memory update
      const messages = shortTermMemory.getMessages(message.sessionId)
      if (messages.length % INTERACTION_THRESHOLD === 0) {
        // This would trigger a background summarization task
        // For now, just log it
        this.log('long_term_memory_update_due', {
          interactionCount: messages.length,
        })
      }

      return {
        success: agentResponse.success,
        data: userFacingResponse,
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.log('orchestrator_error', { error: errorMsg })

      span.status = 'error'
      span.attributes['error'] = errorMsg

      return {
        success: false,
        error: errorMsg,
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } finally {
      span.end()
    }
  }

  /**
   * Build an AgentMessage from routing intent
   * Properly typed for the target agent
   */
  private buildMessage(
    intent: Awaited<ReturnType<typeof routeIntent>>,
    originalMessage: AgentMessage
  ): AgentMessage {
    return {
      id: uuidv4(),
      from: 'orchestrator',
      to: intent.targetAgent,
      type: 'request',
      action: intent.action,
      payload: intent.extractedParams,
      correlationId: originalMessage.correlationId,
      sessionId: originalMessage.sessionId,
      userId: originalMessage.userId,
      timestamp: Date.now(),
      priority: originalMessage.priority,
    }
  }

  /**
   * Format agent response into natural language for the user
   * Only the orchestrator calls the LLM for this
   */
  private async formatResponse(
    agentResponse: AgentResponse,
    longTermMem: Awaited<ReturnType<typeof loadLongTermMemory>>
  ): Promise<string> {
    try {
      if (!agentResponse.success) {
        // For errors, provide a simple user-friendly message
        return `I encountered an issue: ${agentResponse.error}. Please try again or contact support.`
      }

      // For successful responses, optionally use LLM to generate natural language
      // This is fire-and-forget so failures don't block the response
      const systemPrompt = `You are a helpful assistant for LiftGO marketplace.
Convert the structured agent response into a friendly, natural language message for the user.
Be concise but informative.`

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 256,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Format this response for a user: ${JSON.stringify(agentResponse.data)}`,
          },
        ],
      })

      const textContent = response.content.find(b => b.type === 'text')
      if (textContent && textContent.type === 'text') {
        return textContent.text
      }

      // Fallback to JSON stringification
      return JSON.stringify(agentResponse.data)
    } catch (error) {
      console.error('[OrchestratorAgent] Error formatting response:', error)
      // Fallback to JSON stringification
      return JSON.stringify(agentResponse.data)
    }
  }
}

/**
 * Factory function to create and return singleton orchestrator instance
 */
export function createOrchestratorAgent(): OrchestratorAgent {
  return new OrchestratorAgent()
}
