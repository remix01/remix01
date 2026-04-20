import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runLangGraphChat } from '@/lib/ai/langgraph'
import { getLangSmithStatus } from '@/lib/ai/langsmith'

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
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: parsed.error.issues,
        },
        { status: 400 }
      )
    }

    const result = await runLangGraphChat(parsed.data)

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
  })
}
