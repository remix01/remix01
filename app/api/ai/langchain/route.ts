import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runLangGraphChat } from '@/lib/ai/langgraph'
import { getLangSmithStatus } from '@/lib/ai/langsmith'
import { getAICapabilityStatus, hasMinimumAIStackReady } from '@/lib/ai/capabilities'
import { validateAIRequest } from '@/lib/ai/ai-security-middleware'
import { safeLogAgentUsage } from '@/lib/agents/usage-logging'

const ALLOWED_MODELS = ['gpt-4o-mini', 'gpt-4o'] as const
const DEFAULT_MODEL = 'gpt-4o-mini'

const requestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(8000),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
})

function resolveModel(requested?: string): string {
  if (!requested) return DEFAULT_MODEL
  if ((ALLOWED_MODELS as readonly string[]).includes(requested)) return requested
  return DEFAULT_MODEL
}

export async function POST(request: NextRequest) {
  try {
    const security = await validateAIRequest(request)
    if ('error' in security) return security.error
    const { context: secCtx } = security

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

    const resolvedModel = resolveModel(parsed.data.model)

    const startTime = Date.now()
    const result = await runLangGraphChat({ ...parsed.data, model: resolvedModel })
    const responseTimeMs = Date.now() - startTime

    // TODO: LangChain ChatOpenAI does not expose token usage in response metadata.
    // To capture real values, the LangGraph integration needs to return
    // `response.usage_metadata` from the ChatOpenAI response object.
    safeLogAgentUsage({
      userId: secCtx.userId,
      modelUsed: resolvedModel,
      tokensInput: 0,
      tokensOutput: 0,
      costUsd: 0,
      responseCached: false,
      agentType: 'langgraph',
      userMessage: parsed.data.prompt,
      responseTimeMs,
      messagePreviewLimit: 500,
      endpoint: 'ai/langchain',
    })

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
