import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { runLangGraphChat } from '@/lib/ai/langgraph'
import { getLangSmithStatus } from '@/lib/ai/langsmith'
import { getAICapabilityStatus, hasMinimumAIStackReady } from '@/lib/ai/capabilities'
import { checkAIRateLimit } from '@/lib/rate-limit/limiters'
import { logAgentUsage } from '@/lib/agents/usage-logging'
import { handleAuthError } from '@/lib/api/auth-errors'

const requestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(8000),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) return handleAuthError(authError)
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Nepooblaščen dostop.', canonical_error: { code: 'UNAUTHORIZED', message: 'Nepooblaščen dostop.' } },
        { status: 401 }
      )
    }

    const rateLimitResponse = await checkAIRateLimit(request, user.id)
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: parsed.error.issues,
        },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    const result = await runLangGraphChat(parsed.data)
    const responseTimeMs = Date.now() - startTime

    logAgentUsage({
      userId: user.id,
      modelUsed: parsed.data.model || 'langgraph-default',
      tokensInput: 0,
      tokensOutput: 0,
      costUsd: 0,
      responseCached: false,
      agentType: 'langgraph',
      userMessage: parsed.data.prompt,
      responseTimeMs,
      messagePreviewLimit: 500,
    }).catch((err) => console.error('[ai/langchain] usage log failed:', err))

    return NextResponse.json({
      success: true,
      output: result.output,
      tracing: result.tracing,
      orchestration: 'langgraph',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'ai-langchain',
    orchestration: 'langgraph',
    tracing: getLangSmithStatus(),
    capabilities: getAICapabilityStatus(),
    minimumReady: hasMinimumAIStackReady(),
  })
}
