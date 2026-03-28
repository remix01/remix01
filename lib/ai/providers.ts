/**
 * Multi-Provider AI Module for LiftGO
 *
 * Intelligent routing between AI providers:
 * - Anthropic (Claude): Primary for chat & vision
 * - OpenAI: Embeddings, fallback chat
 * - Gemini: Cost-effective fallback
 * - Perplexity: Real-time search & research
 */

import Anthropic from '@anthropic-ai/sdk'
import {
  env,
  hasAnthropicAI,
  hasOpenAI,
  hasGemini,
  hasPerplexity,
  type AIProvider,
} from '@/lib/env'

// Initialize clients lazily
let anthropicClient: Anthropic | null = null
function getAnthropicClient(): Anthropic {
  if (!anthropicClient && hasAnthropicAI()) {
    anthropicClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  }
  if (!anthropicClient) throw new Error('Anthropic API key not configured')
  return anthropicClient
}

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatOptions {
  provider?: AIProvider
  model?: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

export interface ChatResult {
  content: string
  provider: AIProvider
  model: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
  costUsd: number
}

export interface SearchOptions {
  provider?: 'perplexity' | 'openai'
  model?: string
  maxTokens?: number
}

export interface SearchResult {
  content: string
  citations?: string[]
  provider: string
  model: string
}

// ═══════════════════════════════════════════════════════════════════════════
// Chat Completions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send a chat message using the best available provider
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResult> {
  const provider = options.provider || selectChatProvider()

  switch (provider) {
    case 'anthropic':
      return chatWithAnthropic(messages, options)
    case 'openai':
      return chatWithOpenAI(messages, options)
    case 'gemini':
      return chatWithGemini(messages, options)
    default:
      throw new Error(`No chat provider available`)
  }
}

async function chatWithAnthropic(
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatResult> {
  const client = getAnthropicClient()
  const model = options.model || 'claude-sonnet-4-20250514'

  // Extract system message if present
  const systemMessage = messages.find((m) => m.role === 'system')
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens || 2048,
    system: options.systemPrompt || systemMessage?.content,
    messages: chatMessages,
    temperature: options.temperature,
  })

  const content = response.content
    .filter((block): block is { type: 'text'; text: string; citations?: unknown } => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  return {
    content,
    provider: 'anthropic',
    model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
    costUsd: calculateCost('anthropic', model, response.usage.input_tokens, response.usage.output_tokens),
  }
}

async function chatWithOpenAI(
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatResult> {
  const model = options.model || 'gpt-4o-mini'

  const openaiMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  if (options.systemPrompt && !messages.find((m) => m.role === 'system')) {
    openaiMessages.unshift({ role: 'system', content: options.systemPrompt })
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: openaiMessages,
      max_tokens: options.maxTokens || 2048,
      temperature: options.temperature,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const data = await response.json()
  const choice = data.choices[0]

  return {
    content: choice.message.content,
    provider: 'openai',
    model,
    usage: {
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
    },
    costUsd: calculateCost('openai', model, data.usage.prompt_tokens, data.usage.completion_tokens),
  }
}

async function chatWithGemini(
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatResult> {
  const model = options.model || 'gemini-1.5-flash'

  // Convert messages to Gemini format
  const geminiMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const systemInstruction = options.systemPrompt || messages.find((m) => m.role === 'system')?.content

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiMessages,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 2048,
          temperature: options.temperature,
        },
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`)
  }

  const data = await response.json()
  const content = data.candidates[0].content.parts[0].text

  // Gemini doesn't provide token counts in the same way
  const inputTokens = Math.ceil(JSON.stringify(geminiMessages).length / 4)
  const outputTokens = Math.ceil(content.length / 4)

  return {
    content,
    provider: 'gemini',
    model,
    usage: { inputTokens, outputTokens },
    costUsd: calculateCost('gemini', model, inputTokens, outputTokens),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Perplexity Search
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Search and answer using Perplexity's real-time search
 */
export async function search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  if (!hasPerplexity()) {
    // Fallback to OpenAI if Perplexity not available
    if (hasOpenAI()) {
      const result = await chatWithOpenAI(
        [{ role: 'user', content: query }],
        { systemPrompt: 'Answer the question concisely with current information.' }
      )
      return {
        content: result.content,
        provider: 'openai',
        model: result.model,
      }
    }
    throw new Error('No search provider available')
  }

  const model = options.model || 'llama-3.1-sonar-small-128k-online'

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'Be precise and concise. Provide sources when available.',
        },
        { role: 'user', content: query },
      ],
      max_tokens: options.maxTokens || 1024,
    }),
  })

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.statusText}`)
  }

  const data = await response.json()

  return {
    content: data.choices[0].message.content,
    citations: data.citations || [],
    provider: 'perplexity',
    model,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Vision Analysis
// ═══════════════════════════════════════════════════════════════════════════

export interface VisionOptions {
  provider?: 'anthropic' | 'openai' | 'gemini'
  model?: string
  maxTokens?: number
}

export interface VisionResult {
  analysis: string
  provider: string
  model: string
}

/**
 * Analyze an image using the best available vision model
 */
export async function analyzeImageMultiProvider(
  imageUrl: string,
  prompt: string,
  options: VisionOptions = {}
): Promise<VisionResult> {
  const provider = options.provider || selectVisionProvider()

  switch (provider) {
    case 'anthropic':
      return analyzeWithAnthropic(imageUrl, prompt, options)
    case 'openai':
      return analyzeWithOpenAI(imageUrl, prompt, options)
    case 'gemini':
      return analyzeWithGemini(imageUrl, prompt, options)
    default:
      throw new Error('No vision provider available')
  }
}

async function analyzeWithAnthropic(
  imageUrl: string,
  prompt: string,
  options: VisionOptions
): Promise<VisionResult> {
  const client = getAnthropicClient()
  const model = options.model || 'claude-sonnet-4-20250514'

  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens || 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: imageUrl },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  })

  const analysis = response.content
    .filter((block): block is { type: 'text'; text: string; citations?: unknown } => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  return { analysis, provider: 'anthropic', model }
}

async function analyzeWithOpenAI(
  imageUrl: string,
  prompt: string,
  options: VisionOptions
): Promise<VisionResult> {
  const model = options.model || 'gpt-4o'

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: options.maxTokens || 2048,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI Vision error: ${response.statusText}`)
  }

  const data = await response.json()
  return {
    analysis: data.choices[0].message.content,
    provider: 'openai',
    model,
  }
}

async function analyzeWithGemini(
  imageUrl: string,
  prompt: string,
  options: VisionOptions
): Promise<VisionResult> {
  const model = options.model || 'gemini-1.5-flash'

  // Fetch image and convert to base64
  const imageResponse = await fetch(imageUrl)
  const imageBuffer = await imageResponse.arrayBuffer()
  const base64Image = Buffer.from(imageBuffer).toString('base64')
  const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini Vision error: ${response.statusText}`)
  }

  const data = await response.json()
  return {
    analysis: data.candidates[0].content.parts[0].text,
    provider: 'gemini',
    model,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

function selectChatProvider(): AIProvider {
  if (hasAnthropicAI()) return 'anthropic'
  if (hasOpenAI()) return 'openai'
  if (hasGemini()) return 'gemini'
  throw new Error('No chat provider configured')
}

function selectVisionProvider(): 'anthropic' | 'openai' | 'gemini' {
  if (hasAnthropicAI()) return 'anthropic'
  if (hasOpenAI()) return 'openai'
  if (hasGemini()) return 'gemini'
  throw new Error('No vision provider configured')
}

// Cost per 1M tokens
const COSTS: Record<string, Record<string, { input: number; output: number }>> = {
  anthropic: {
    'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
    'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
  },
  openai: {
    'gpt-4o': { input: 2.5, output: 10.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
  },
  gemini: {
    'gemini-1.5-flash': { input: 0.075, output: 0.3 },
    'gemini-1.5-pro': { input: 1.25, output: 5.0 },
  },
}

function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const providerCosts = COSTS[provider]
  const modelCosts = providerCosts?.[model] || { input: 1.0, output: 1.0 }
  return (inputTokens / 1_000_000) * modelCosts.input + (outputTokens / 1_000_000) * modelCosts.output
}
