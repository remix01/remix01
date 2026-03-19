/**
 * POST /api/agent/orchestrate
 *
 * Entry point for the multi-agent system.
 * Initializes agents on first cold start, then routes the user's message
 * through OrchestratorAgent → IntentRouter → specialist agent (via MessageBus).
 *
 * Flow:
 *   1. Auth + tier check
 *   2. ensureAgentsInitialized() (no-op if already done)
 *   3. Send message to OrchestratorAgent via MessageBus
 *   4. Orchestrator classifies intent → routes to InquiryAgent / EscrowAgent /
 *      DisputeAgent / NotifyAgent
 *   5. Response formatted by Orchestrator → returned to client
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@/lib/supabase/server'
import { ensureAgentsInitialized } from '@/lib/agents/init'
import { messageBus } from '@/lib/agents/base/MessageBus'
import type { AgentMessage } from '@/lib/agents/base/types'

export async function POST(req: NextRequest) {
  // 1. Verify session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })
  }

  const body = await req.json()
  const { message, sessionId } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Sporočilo je obvezno.' }, { status: 400 })
  }

  // 2. Initialize agents (no-op on warm start)
  try {
    await ensureAgentsInitialized()
  } catch (err) {
    console.error('[orchestrate] Agent init failed:', err)
    return NextResponse.json({ error: 'Agent sistem ni na voljo.' }, { status: 503 })
  }

  // 3. Build message for OrchestratorAgent
  const agentMessage: AgentMessage = {
    id: uuidv4(),
    from: 'orchestrator',   // will be overwritten inside orchestrator
    to: 'orchestrator',
    type: 'request',
    action: 'processUserMessage',
    payload: { userMessage: message.trim() },
    correlationId: uuidv4(),
    sessionId: sessionId ?? `session-${user.id}`,
    userId: user.id,
    timestamp: Date.now(),
    priority: 'normal',
  }

  // 4. Route through MessageBus → OrchestratorAgent
  try {
    const response = await messageBus.send(agentMessage)

    if (!response.success) {
      return NextResponse.json(
        { error: response.error ?? 'Agent ni mogel obdelati sporočila.' },
        { status: 422 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: response.data,
      durationMs: response.durationMs,
      handledBy: response.handledBy,
    })
  } catch (err) {
    console.error('[orchestrate] MessageBus error:', err)
    return NextResponse.json(
      { error: 'Napaka pri procesiranju sporočila.' },
      { status: 500 }
    )
  }
}
