/**
 * Agent Context
 * Encapsulates user session, permissions, audit context, and conversation history
 */

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
}

export interface AgentContext {
  userId: string
  userEmail: string
  userRole: 'user' | 'partner' | 'admin' | 'system'
  sessionId: string
  timestamp: Date
  ipAddress?: string
  // Conversation history for stateful reasoning
  messages?: ConversationMessage[]
  // Active resource IDs in current conversation
  activeResourceIds?: {
    inquiryId?: string
    offerId?: string
    escrowId?: string
  }
}

export interface ToolCallRequest {
  tool: string
  params: Record<string, unknown>
  context: AgentContext
}

export interface ToolCallResult {
  success: boolean
  data?: unknown
  error?: string
  code?: number
}

/**
 * Create agent context from session data
 */
export function createAgentContext(
  userId: string,
  userEmail: string,
  userRole: 'user' | 'partner' | 'admin',
  sessionId: string,
  ipAddress?: string
): AgentContext {
  return {
    userId,
    userEmail,
    userRole,
    sessionId,
    timestamp: new Date(),
    ipAddress,
    messages: [],
    activeResourceIds: {},
  }
}

/**
 * Add message to conversation history
 */
export function addMessage(
  context: AgentContext,
  role: 'user' | 'assistant',
  content: string
): AgentContext {
  const messages = context.messages || []
  return {
    ...context,
    messages: [
      ...messages,
      { role, content, timestamp: Date.now() },
    ],
  }
}

/**
 * Update active resource IDs in context
 * Called when a tool creates/selects a new resource
 */
export function updateActiveResources(
  context: AgentContext,
  updates: {
    inquiryId?: string
    offerId?: string
    escrowId?: string
  }
): AgentContext {
  return {
    ...context,
    activeResourceIds: {
      ...context.activeResourceIds,
      ...updates,
    },
  }
}

/**
 * Get conversation for LLM API
 * Formats messages in Claude message format
 */
export function getConversationForLLM(context: AgentContext): Array<{
  role: 'user' | 'assistant'
  content: string
}> {
  return (context.messages || []).map(msg => ({
    role: msg.role,
    content: msg.content,
  }))
}
