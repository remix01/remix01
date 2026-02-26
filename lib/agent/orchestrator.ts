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
import {
  shortTermMemory,
  loadLongTermMemory,
  appendActivity,
  formatForSystemPrompt,
} from './memory'

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

// System prompt template — {longTermContext} is replaced per-request with
// the user's persistent preferences, history summary, and recent actions.
const SYSTEM_PROMPT = `You are an AI agent for LiftGO, a marketplace connecting customers with craftspeople.

{longTermContext}

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
    // ── LONG-TERM MEMORY (load) ────────────────────────────────────────────
    // Fetch persistent user preferences, history summary, and recent actions.
    // Fire-and-continue: if DB is slow we still proceed with an empty record.
    const longTermMem = await loadLongTermMemory(context.userId)
    const longTermContext = formatForSystemPrompt(longTermMem)

    // ── SHORT-TERM MEMORY ──────────────────────────────────────────────────
    // Retrieve or create session state. This gives the LLM full conversation
    // history and the currently active resource IDs (inquiry/offer/escrow).
    const memState = shortTermMemory.getOrCreate(context.sessionId, context.userId)

    // Record the incoming user message into memory
    shortTermMemory.addMessage(context.sessionId, {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    })

    // Build active resources string from memory (authoritative source of truth)
    const activeResources = [
      memState.activeInquiryId ? `inquiryId=${memState.activeInquiryId}` : null,
      memState.activeOfferId   ? `offerId=${memState.activeOfferId}`     : null,
      memState.activeEscrowId  ? `escrowId=${memState.activeEscrowId}`   : null,
    ]
      .filter(Boolean)
      .join(', ') || 'none'

    // Format system prompt with both long-term and live context
    const systemPrompt = SYSTEM_PROMPT
      .replace('{longTermContext}', longTermContext)
      .replace('{userId}', context.userId)
      .replace('{userRole}', context.userRole)
      .replace('{activeResources}', activeResources)

    // Build messages: persisted history (without current message — already added above)
    // Use messages stored in memory, excluding the one we just added, so we can
    // append the current turn after we get the response.
    const historyForLLM = memState.messages
      .slice(0, -1) // exclude the user message we just pushed — will be last
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const messages = [
      ...historyForLLM,
      { role: 'user' as const, content: userMessage },
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

    // ── RECORD ASSISTANT RESPONSE IN MEMORY ───────────────────────────────
    shortTermMemory.addMessage(context.sessionId, {
      role: 'assistant',
      content: textContent.text,
      timestamp: Date.now(),
      toolCall: { tool: toolCall.tool, params: toolCall.params },
    })

    // Track last tool call name for debugging / analytics
    if (toolCall.tool !== 'chat') {
      const state = shortTermMemory.getContext(context.sessionId)
      if (state) {
        // Mutate updatedAt via setActiveResource as a side-effect-free way;
        // we update lastToolCall directly since it's the same in-memory ref.
        state.lastToolCall = toolCall.tool
      }

      // ── EXTRACT ACTIVE RESOURCE IDs FROM PARAMS ─────────────────────
      // Persist any resource IDs returned in params so the LLM can refer
      // to them implicitly in follow-up turns.
      const p = toolCall.params as Record<string, unknown>
      if (typeof p.escrowId  === 'string') shortTermMemory.setActiveResource(context.sessionId, 'escrowId',  p.escrowId)
      if (typeof p.inquiryId === 'string') shortTermMemory.setActiveResource(context.sessionId, 'inquiryId', p.inquiryId)
      if (typeof p.offerId   === 'string') shortTermMemory.setActiveResource(context.sessionId, 'offerId',   p.offerId)

      // ── LONG-TERM MEMORY (flush) ───────────────────────────────────
      // Append this tool call to the user's persistent activity log.
      // Fire-and-forget: don't await so it never delays the response.
      appendActivity(context.userId, {
        tool: toolCall.tool,
        resourceId: (
          (p.escrowId  as string) ??
          (p.inquiryId as string) ??
          (p.offerId   as string) ??
          undefined
        ),
        timestamp: Date.now(),
        success: true,
      }).catch(err =>
        console.error('[ORCHESTRATOR] Long-term memory flush error:', err)
      )
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
