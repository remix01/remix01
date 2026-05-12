import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

const modelMap = {
  'gpt-4o': openai('gpt-4o'),
  'claude-3.5-sonnet': anthropic('claude-3-5-sonnet-latest'),
} as const

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messages, model = 'gpt-4o' } = await req.json()

  const result = streamText({
    model: modelMap[model as keyof typeof modelMap] ?? modelMap['gpt-4o'],
    messages,
    system:
      'You are LiftGO AI Sandbox assistant. When generating code, always return a fenced code block as the first block and keep explanations brief.',
  })

  return result.toDataStreamResponse()
}
