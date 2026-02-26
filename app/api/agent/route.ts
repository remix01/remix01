import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureAgentsInitialized } from '@/lib/agents/init'
import { messageBus } from '@/lib/agents/base/MessageBus'
import { shortTermMemory } from '@/lib/agent/memory'
import { anomalyDetector } from '@/lib/observability/alerting'

/**
 * POST /api/agent
 * 
 * Main entry point for the multi-agent system.
 * 
 * Takes a user message and routes it through the orchestrator agent,
 * which then routes to specialized domain agents via MessageBus.
 * 
 * Request body:
 * {
 *   message: string (max 2000 chars)
 *   sessionId?: string (optional, used to maintain conversation context)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   data?: any (result from orchestrator)
 *   error?: string
 *   sessionId: string (for maintaining conversation context)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Ensure agents are initialized on first request
    ensureAgentsInitialized()

    // Authenticate user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const { message, sessionId } = await req.json()

    // Validate message
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid message' },
        { status: 400 }
      )
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Message too long (max 2000 characters)' },
        { status: 400 }
      )
    }

    // Generate session ID if not provided
    const session = sessionId || crypto.randomUUID()

    // Record activity for anomaly detection (non-blocking)
    anomalyDetector.record('tool_call', user.id, session)

    // Build agent message for orchestrator
    const agentMessage = {
      id: crypto.randomUUID(),
      from: 'user' as const,
      to: 'orchestrator' as const,
      type: 'request' as const,
      action: 'processUserMessage',
      payload: {
        message,
        userRole: user.user_metadata?.role || 'user',
      },
      correlationId: crypto.randomUUID(),
      sessionId: session,
      userId: user.id,
      timestamp: Date.now(),
      priority: 'normal' as const,
    }

    // Send to message bus — orchestrator receives and processes
    const result = await messageBus.send(agentMessage)

    // Return response with session ID for client to maintain context
    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      sessionId: session,
    })

  } catch (error) {
    console.error('[Agent API] Error:', error)

    // Never expose internal agent details in error responses
    return NextResponse.json(
      { success: false, error: 'Agent system unavailable' },
      { status: 500 }
    )
  }
}
