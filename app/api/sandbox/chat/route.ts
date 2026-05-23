import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { streamText, type LanguageModel } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { validateAIRequest } from '@/lib/ai/ai-security-middleware'

const modelMap = {
  'gpt-4o': openai('gpt-4o'),
  'claude-3.5-sonnet': anthropic('claude-3-5-sonnet-latest'),
} as const

export async function POST(req: NextRequest) {
  const security = await validateAIRequest(req)
  if ('error' in security) return security.error

  const { messages, model = 'gpt-4o' } = await req.json()
  if (!Array.isArray(messages)) {
    return NextResponse.json({ ok: false, error: 'Messages array is required.' }, { status: 400 })
  }

  const selectedModel = (modelMap[model as keyof typeof modelMap] ?? modelMap['gpt-4o']) as unknown as LanguageModel

  const result = streamText({
    model: selectedModel,
    messages,
    system:
      'You are LiftGO AI Sandbox assistant. When generating code, always return a fenced code block as the first block and keep explanations brief.',
  })

  return result.toTextStreamResponse()
}
