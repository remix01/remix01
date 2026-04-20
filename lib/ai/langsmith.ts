import { env, hasOpenAI, hasLangSmith } from '@/lib/env'

interface LangChainChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

/**
 * Sync typed env config into process.env so LangChain/LangSmith auto-tracing can pick it up.
 * Safe to call multiple times.
 */
export function configureLangSmithTracing(): void {
  if (env.LANGSMITH_TRACING) process.env.LANGSMITH_TRACING = env.LANGSMITH_TRACING
  if (env.LANGSMITH_ENDPOINT) process.env.LANGSMITH_ENDPOINT = env.LANGSMITH_ENDPOINT
  if (env.LANGSMITH_API_KEY) process.env.LANGSMITH_API_KEY = env.LANGSMITH_API_KEY
  if (env.LANGSMITH_PROJECT) process.env.LANGSMITH_PROJECT = env.LANGSMITH_PROJECT
}

export function getLangSmithStatus() {
  return {
    enabled: hasLangSmith(),
    endpoint: env.LANGSMITH_ENDPOINT || null,
    project: env.LANGSMITH_PROJECT || null,
  }
}

/**
 * Creates a LangChain ChatOpenAI model with sensible defaults.
 * Requires `@langchain/openai` to be installed.
 */
export async function createLangChainChatModel(options: LangChainChatOptions = {}) {
  if (!hasOpenAI()) {
    throw new Error('OPENAI_API_KEY is missing. Configure it before using LangChain ChatOpenAI.')
  }

  configureLangSmithTracing()

  const dynamicImport = new Function('m', 'return import(m)') as (moduleName: string) => Promise<any>
  const { ChatOpenAI } = await dynamicImport('@langchain/openai')

  return new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: options.model || 'gpt-4o-mini',
    temperature: options.temperature ?? 0.2,
    maxTokens: options.maxTokens ?? 1200,
  })
}
