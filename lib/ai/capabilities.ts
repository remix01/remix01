import { env } from '@/lib/env'
import { getLangSmithStatus } from '@/lib/ai/langsmith'

export interface AICapabilityStatus {
  langchain: { implemented: boolean; detail: string }
  langgraph: { implemented: boolean; detail: string }
  deepAgents: { implemented: boolean; detail: string }
  integrations: { implemented: boolean; detail: string }
  langsmith: { implemented: boolean; detail: string }
}

export function getAICapabilityStatus(): AICapabilityStatus {
  const langsmith = getLangSmithStatus()

  return {
    langchain: {
      implemented: true,
      detail: 'ChatOpenAI is initialized through createLangChainChatModel()',
    },
    langgraph: {
      implemented: true,
      detail: 'runLangGraphChat() executes START -> generate_response -> END with timeout guard',
    },
    deepAgents: {
      implemented: true,
      detail: 'Autonomous tool-use loop is implemented in executeAgent() with max iterations',
    },
    integrations: {
      implemented: true,
      detail: 'Supabase, Anthropic/OpenAI, and platform APIs are integrated through orchestrator routes',
    },
    langsmith: {
      implemented: langsmith.enabled,
      detail: langsmith.enabled
        ? `Tracing enabled for project ${langsmith.project ?? 'default'}`
        : 'Tracing code exists; enable via LANGSMITH_* environment variables',
    },
  }
}

export function hasMinimumAIStackReady(status = getAICapabilityStatus()): boolean {
  return status.langchain.implemented && status.langgraph.implemented && status.deepAgents.implemented
}
