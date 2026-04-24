import { NextRequest } from 'next/server'
import { z } from 'zod'
import { runLangGraphChat } from '@/lib/ai/langgraph'
import { getLangSmithStatus } from '@/lib/ai/langsmith'
import { ok, fail } from '@/lib/http/response'

const requestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(8000),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return fail('Invalid request body', 400, { issues: parsed.error.issues })
    }

    const result = await runLangGraphChat(parsed.data)

    return ok({
      success: true,
      output: result.output,
      tracing: result.tracing,
      orchestration: 'langgraph',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return fail(message, 500)
  }
}

export async function GET() {
  return ok({
    status: 'ok',
    service: 'ai-langchain',
    orchestration: 'langgraph',
    tracing: getLangSmithStatus(),
  })
}
