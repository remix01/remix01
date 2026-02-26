/**
 * Intent Router — Classifies user intent and routes to appropriate agent
 * 
 * Calls Claude to understand what the user wants and extracts relevant parameters.
 * Returns an intent that the OrchestratorAgent uses to route to the right specialist.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { AgentType } from '../base/types'
import type { ConversationState } from '@/lib/agent/memory/shortTerm'

export interface Intent {
  action: string              // e.g., 'createInquiry', 'releaseEscrow'
  targetAgent: AgentType      // Which agent should handle this
  confidence: number          // 0-1, lower values → ask for clarification
  extractedParams: Record<string, unknown>  // Parameters extracted from user message
}

/**
 * Map actions to their handling agents
 */
export const intentMap: Record<string, AgentType> = {
  // Inquiry actions
  'createInquiry': 'inquiry',
  'listInquiries': 'inquiry',
  'closeInquiry': 'inquiry',

  // Escrow actions
  'submitOffer': 'escrow',
  'acceptOffer': 'escrow',
  'captureEscrow': 'escrow',
  'releaseEscrow': 'escrow',
  'refundEscrow': 'escrow',
  'escrowStatus': 'escrow',

  // Dispute actions
  'openDispute': 'dispute',
  'resolveDispute': 'dispute',
  'disputeStatus': 'dispute',

  // Notify actions
  'sendNotification': 'notify',
  'updatePreferences': 'notify',
}

const anthropic = new Anthropic()

/**
 * Route user message intent to correct agent
 * Calls Claude to classify intent and extract parameters
 */
export async function routeIntent(
  userMessage: string,
  context: ConversationState
): Promise<Intent> {
  try {
    const systemPrompt = `You are an intent classifier for LiftGO marketplace.
Your job is to understand what action the user wants to perform and extract relevant parameters.

Available actions:
${Object.entries(intentMap)
  .map(([action, agent]) => `- ${action} (handled by ${agent})`)
  .join('\n')}

Context about this user:
- Session ID: ${context.sessionId}
- Active inquiry ID: ${context.activeInquiryId ?? 'none'}
- Active offer ID: ${context.activeOfferId ?? 'none'}
- Active escrow ID: ${context.activeEscrowId ?? 'none'}

Respond with JSON in this exact format:
{
  "action": "string - one of the available actions above",
  "confidence": "number 0-1, higher if message is clear",
  "extractedParams": "object with extracted parameters (empty if unclear)",
  "clarificationNeeded": "string - if confidence < 0.6, ask user to clarify. Otherwise null"
}

Rules:
- If the user mentions a resource ID (inquiry, offer, escrow), include it in extractedParams
- If confidence < 0.6, set action to 'clarify' and include a clarification question
- Always return valid JSON
`

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    const textContent = response.content.find(b => b.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return {
        action: 'clarify',
        targetAgent: 'orchestrator',
        confidence: 0,
        extractedParams: {
          clarification: "I didn't understand your request. Could you please rephrase?",
        },
      }
    }

    // Parse Claude response
    let parsed
    try {
      // Extract JSON from the response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      parsed = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('[intentRouter] Failed to parse Claude response:', textContent.text)
      return {
        action: 'clarify',
        targetAgent: 'orchestrator',
        confidence: 0,
        extractedParams: {
          clarification: 'I had trouble understanding that. Could you try again?',
        },
      }
    }

    // Handle clarification case
    if (parsed.confidence < 0.6) {
      return {
        action: 'clarify',
        targetAgent: 'orchestrator',
        confidence: parsed.confidence,
        extractedParams: {
          clarification: parsed.clarificationNeeded,
        },
      }
    }

    // Look up the target agent for this action
    const targetAgent = intentMap[parsed.action] ?? 'orchestrator'

    return {
      action: parsed.action,
      targetAgent,
      confidence: parsed.confidence,
      extractedParams: parsed.extractedParams ?? {},
    }
  } catch (error) {
    console.error('[intentRouter] Error routing intent:', error)
    return {
      action: 'clarify',
      targetAgent: 'orchestrator',
      confidence: 0,
      extractedParams: {
        clarification: 'I encountered an error processing your request. Please try again.',
      },
    }
  }
}
