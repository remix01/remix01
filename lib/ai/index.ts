/**
 * LiftGO AI Module
 *
 * Central exports for AI functionality:
 * - RAG: Retrieval-Augmented Generation with pgvector
 * - Tools: Function calling / tool stacking
 * - Orchestrator: Unified agent execution with all features
 * - Providers: Multi-provider AI routing (Anthropic, OpenAI, Gemini, Perplexity)
 */

// RAG - Semantic Search
export {
  generateEmbedding,
  storeEmbedding,
  backfillEmbeddings,
  searchTasks,
  searchObrtniki,
  searchMessages,
  searchOffers,
  buildRAGContext,
  formatRAGContextForPrompt,
  type EmbeddingTarget,
  type RAGContext,
} from './rag'

// Tools - Function Calling
export {
  AI_TOOLS,
  TOOL_HANDLERS,
  executeTool,
  getToolsForAgent,
  type ToolHandler,
} from './tools'

// Orchestrator - Unified Agent Execution
export {
  executeAgent,
  analyzeImage,
  AgentAccessError,
  QuotaExceededError,
  type AgentExecutionOptions,
  type AgentExecutionResult,
} from './orchestrator'

// Multi-Provider AI
export {
  chat,
  search,
  analyzeImageMultiProvider,
  type ChatMessage,
  type ChatOptions,
  type ChatResult,
  type SearchOptions,
  type SearchResult,
  type VisionOptions,
  type VisionResult,
} from './providers'


// LangChain + LangSmith integration helpers
export {
  configureLangSmithTracing,
  getLangSmithStatus,
  createLangChainChatModel,
} from './langsmith'


// LangGraph integration helpers
export { runLangGraphChat, type LangGraphRunInput, type LangGraphRunResult } from './langgraph'
