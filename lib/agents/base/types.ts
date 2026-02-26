/**
 * Multi-Agent System Types
 * 
 * Defines the message contract and response structures for inter-agent communication.
 * All agents communicate exclusively through the MessageBus using these types.
 */

export type AgentType =
  | 'orchestrator'
  | 'inquiry'
  | 'escrow'
  | 'dispute'
  | 'notify'

export type MessageType = 'request' | 'response' | 'event'

export type Priority = 'low' | 'normal' | 'high'

/**
 * AgentMessage — Single unit of communication between agents.
 * All inter-agent communication uses this structure.
 */
export interface AgentMessage {
  id: string                    // UUID for this message
  from: AgentType               // Sending agent
  to: AgentType                 // Receiving agent
  type: MessageType             // 'request', 'response', or 'event'
  action: string                // What to do: 'createInquiry', 'captureEscrow', etc.
  payload: Record<string, unknown>  // Action parameters
  correlationId: string         // Links request → response pairs
  sessionId: string             // Agent session identifier
  userId: string                // Affected user ID
  timestamp: number             // Message creation time (ms since epoch)
  priority: Priority            // Processing priority
}

/**
 * AgentResponse — Standard response from an agent after processing a message.
 */
export interface AgentResponse {
  success: boolean              // Whether the action succeeded
  data?: unknown                // Result data if successful
  error?: string                // Error message if failed
  handledBy: AgentType          // Which agent processed this
  durationMs: number            // Processing time in milliseconds
}
