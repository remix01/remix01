import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

const modelMap = {
  'gpt-4o': openai('gpt-4o'),
  'claude-3.5-sonnet': anthropic('claude-3-5-sonnet-latest'),
} as const

export async function POST(req: Request) {
  const { messages, model = 'gpt-4o' } = await req.json()

  const result = streamText({
    model: modelMap[model as keyof typeof modelMap] ?? modelMap['gpt-4o'],
    messages,
    system:
      'You are LiftGO AI Sandbox assistant. When generating code, always return a fenced code block as the first block and keep explanations brief.',
  })

  return result.toDataStreamResponse()
}
