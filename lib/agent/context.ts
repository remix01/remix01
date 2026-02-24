/**
 * Agent Context
 * Encapsulates user session, permissions, and audit context for tool execution
 */

export interface AgentContext {
  userId: string
  userEmail: string
  userRole: 'user' | 'partner' | 'admin' | 'system'
  sessionId: string
  timestamp: Date
  ipAddress?: string
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
  }
}
