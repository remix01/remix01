/**
 * AI Orchestrator — Main Brain of the Agent
 * 
 * 1. Receives user message + session context
 * 2. Sends to Claude with system prompt listing available tools
 * 3. LLM returns structured tool call: { tool: string, params: object }
 * 4. Never execute tool directly — return to caller for routing
 */

import Anthropic from '@anthropic-ai/sdk'
import { getConversationForLLM, type AgentContext } from './context'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ToolCall {
  tool: string
  params: Record<string, unknown>
}

export interface OrchestratorResponse {
  success: boolean
  toolCall?: ToolCall
  message?: string
  error?: string
}

// System prompt tells LLM what tools are available and constraints
const SYSTEM_PROMPT = `You are an AI agent for LiftGO, a marketplace connecting customers with craftspeople.

AVAILABLE TOOLS:
1. createInquiry
   - Used when customer wants to post a new service request
   - Params: { title, description, categorySlug, location, urgency, budget?, maxResponses? }

2. submitOffer
   - Used when partner wants to quote a customer's inquiry
   - Params: { inquiryId, priceOffered, estimatedDays, notes? }

3. acceptOffer
   - Used when customer accepts a partner's quote
   - Params: { offerId }

4. captureEscrow
   - System tool: moves payment from pending to captured
   - Params: { escrowId }

5. releaseEscrow
   - Used when customer confirms work done and releases payment
   - Params: { escrowId, confirmationDetails? }

6. refundEscrow
   - Admin tool: refunds a disputed escrow
   - Params: { escrowId, reason }

CRITICAL RULES:
- ALWAYS respond with ONLY valid JSON: { "tool": "...", "params": {...} }
- Never ask user for payment details — system handles that
- Never construct database queries or SQL
- Never call APIs directly
- Do NOT respond with free-form text unless user asks a question about your capabilities
- If user message is not actionable as a tool call, respond with: { "tool": "chat", "params": { "message": "..." } }

CONTEXT:
- Current user ID: {userId}
- User role: {userRole}
- Active resources: {activeResources}`;

/**
 * Parse LLM response to extract tool call
 * Strict parsing — must be valid JSON with tool and params
 */
function parseToolCall(response: string): ToolCall | null {
  try {
    // Try to extract JSON from response (in case LLM adds extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    
    // Validate structure
    if (!parsed.tool || typeof parsed.tool !== 'string') return null
    if (!parsed.params || typeof parsed.params !== 'object') return null

    return {
      tool: parsed.tool,
      params: parsed.params,
    }
  } catch (e) {
    return null
  }
}

/**
 * Call Claude with user message and get back structured tool call
 * LLM has no memory between calls — full context passed each time
 * 
 * @param userMessage - What the user said
 * @param context - Session, user role, active resources, conversation history
 * @returns ToolCall to execute or error
 */
export async function orchestrate(
  userMessage: string,
  context: AgentContext
): Promise<OrchestratorResponse> {
  try {
    // Get conversation history for stateful reasoning
    const conversationHistory = getConversationForLLM(context)

    // Format system prompt with context
    const systemPrompt = SYSTEM_PROMPT
      .replace('{userId}', context.userId)
      .replace('{userRole}', context.userRole)
      .replace(
        '{activeResources}',
        context.activeResourceIds
          ? Object.entries(context.activeResourceIds)
              .filter(([_, v]) => v)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ')
          : 'none'
      )

    // Build messages array: full history + new user message
    const messages = [
      ...conversationHistory,
      {
        role: 'user' as const,
        content: userMessage,
      },
    ]

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    // Extract text response
    const textContent = response.content.find(b => b.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return {
        success: false,
        error: 'LLM returned unexpected response format',
      }
    }

    // Parse tool call from response
    const toolCall = parseToolCall(textContent.text)
    if (!toolCall) {
      return {
        success: false,
        error: `Invalid tool call format from LLM: ${textContent.text}`,
      }
    }

    // Reject tool="chat" — agent should only call tools
    if (toolCall.tool === 'chat') {
      return {
        success: false,
        message: toolCall.params?.message as string,
      }
    }

    return {
      success: true,
      toolCall,
    }
  } catch (error) {
    console.error('[ORCHESTRATOR] Error calling LLM:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Test orchestrator with sample message
 * Remove before production
 */
export async function testOrchestrator() {
  const context = {
    userId: 'test-user',
    userEmail: 'test@example.com',
    userRole: 'user' as const,
    sessionId: 'test-session',
    timestamp: new Date(),
    messages: [],
    activeResourceIds: {},
  }

  const result = await orchestrate(
    'I need a plumber to fix my kitchen sink. Location is Ljubljana, I need it done this week.',
    context
  )

  console.log('[ORCHESTRATOR TEST]', JSON.stringify(result, null, 2))
  return result
}
