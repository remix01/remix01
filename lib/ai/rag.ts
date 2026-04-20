/**
 * RAG (Retrieval-Augmented Generation) Module for LiftGO
 *
 * Provides semantic search capabilities using pgvector embeddings.
 * Supports tasks, obrtnik profiles, messages, and offers.
 *
 * Embedding providers (priority order):
 * 1. OpenAI text-embedding-3-small (1536 dim)
 * 2. Gemini text-embedding-004 (768 dim, padded to 1536)
 */

import { createClient } from '@supabase/supabase-js'
import { env, hasOpenAI, hasGemini, hasVoyageAPI } from '@/lib/env'

// Use service role for embedding operations
const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  env.SUPABASE_SERVICE_ROLE_KEY || 'development-service-role-key'
)

// Embedding configuration - standardized to 1536 dimensions
const EMBEDDING_DIMENSIONS = 1536
const OPENAI_QUOTA_COOLDOWN_MS = 60 * 60 * 1000 // 1 hour
let openAIQuotaBlockedUntil = 0
let hasLoggedOpenAIQuotaCooldown = false

class EmbeddingProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmbeddingProviderUnavailableError'
  }
}

class EmbeddingQuotaExceededError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmbeddingQuotaExceededError'
  }
}

function normalizeEmbeddingDimensions(embedding: number[]): number[] {
  if (embedding.length === EMBEDDING_DIMENSIONS) {
    return embedding
  }

  if (embedding.length > EMBEDDING_DIMENSIONS) {
    return embedding.slice(0, EMBEDDING_DIMENSIONS)
  }

  return [...embedding, ...new Array(EMBEDDING_DIMENSIONS - embedding.length).fill(0)]
}

function isOpenAIQuotaError(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false
  const error = (payload as { error?: { code?: string; type?: string } }).error
  if (!error) return false
  return error.code === 'insufficient_quota' || error.type === 'insufficient_quota'
}

export type EmbeddingTarget = 'tasks' | 'obrtnik_profiles' | 'sporocila' | 'ponudbe'

export interface RAGContext {
  tasks?: Array<{
    id: string
    title: string
    description: string
    similarity: number
  }>
  obrtniki?: Array<{
    id: string
    business_name: string
    description: string
    similarity: number
  }>
  messages?: Array<{
    id: string
    message: string
    created_at: string
    similarity: number
  }>
  offers?: Array<{
    id: string
    message: string
    price_estimate: number
    similarity: number
  }>
}

// ═══════════════════════════════════════════════════════════════════════════
// Embedding Generation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate embedding for text using available provider
 * Priority: OpenAI > Voyage > Gemini
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Clean and truncate text
  const cleanText = text.replace(/\s+/g, ' ').trim().slice(0, 8000)

  if (!cleanText) {
    throw new Error('Cannot generate embedding for empty text')
  }

  let hasConfiguredProvider = false
  let hasQuotaFailure = false
  const providerErrors: string[] = []

  // Try OpenAI embeddings (primary - best quality)
  if (hasOpenAI()) {
    hasConfiguredProvider = true
    if (Date.now() < openAIQuotaBlockedUntil) {
      hasQuotaFailure = true
      if (!hasLoggedOpenAIQuotaCooldown) {
        console.info(
          '[RAG] Skipping OpenAI embeddings during quota cooldown window; trying fallback providers.'
        )
        hasLoggedOpenAIQuotaCooldown = true
      }
    } else {
      hasLoggedOpenAIQuotaCooldown = false
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: cleanText,
            dimensions: EMBEDDING_DIMENSIONS,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          return normalizeEmbeddingDimensions(data.data[0].embedding as number[])
        }
        let errorPayload: unknown = null
        try {
          errorPayload = await response.json()
        } catch {
          errorPayload = { error: { message: 'Non-JSON error response from OpenAI embeddings API' } }
        }

        if (isOpenAIQuotaError(errorPayload)) {
          hasQuotaFailure = true
          openAIQuotaBlockedUntil = Date.now() + OPENAI_QUOTA_COOLDOWN_MS
          hasLoggedOpenAIQuotaCooldown = false
          console.warn(
            `[RAG] OpenAI embeddings quota exceeded. Cooling down for ${Math.round(OPENAI_QUOTA_COOLDOWN_MS / 60000)} minutes before retrying.`
          )
        } else {
          providerErrors.push('openai_request_failed')
          console.warn('OpenAI embedding failed:', errorPayload)
        }
      } catch (error) {
        providerErrors.push('openai_network_error')
        console.warn('OpenAI embedding error:', error)
      }
    }
  }

  // Try Voyage embeddings (secondary)
  if (hasVoyageAPI()) {
    hasConfiguredProvider = true
    try {
      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.VOYAGE_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'voyage-3',
          input: cleanText,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return normalizeEmbeddingDimensions(data.data[0].embedding as number[])
      }
      const errorPayload = await response.text()
      providerErrors.push(`voyage_request_failed:${response.status}`)
      console.warn('Voyage embedding failed:', errorPayload)
    } catch (error) {
      providerErrors.push('voyage_network_error')
      console.warn('Voyage embedding error:', error)
    }
  }

  // Try Gemini embeddings (fallback)
  if (hasGemini()) {
    hasConfiguredProvider = true
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text: cleanText }] },
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        const embedding = data.embedding.values as number[]
        return normalizeEmbeddingDimensions(embedding)
      }
      const errorPayload = await response.text()
      providerErrors.push(`gemini_request_failed:${response.status}`)
      console.warn('Gemini embedding failed:', errorPayload)
    } catch (error) {
      providerErrors.push('gemini_network_error')
      console.warn('Gemini embedding error:', error)
    }
  }

  if (!hasConfiguredProvider) {
    throw new EmbeddingProviderUnavailableError(
      'No embedding API available. Configure OPENAI_API_KEY, VOYAGE_API_KEY, or GEMINI_API_KEY.'
    )
  }

  if (hasQuotaFailure && providerErrors.length === 0) {
    throw new EmbeddingQuotaExceededError(
      'All configured embedding providers are rate-limited or in cooldown.'
    )
  }

  const details = providerErrors.length > 0 ? ` (${providerErrors.join(', ')})` : ''
  throw new Error(`Embedding generation failed for all configured providers${details}.`)
}

// ═══════════════════════════════════════════════════════════════════════════
// Embedding Storage
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Store embedding for a specific record
 */
export async function storeEmbedding(
  table: EmbeddingTarget,
  recordId: string,
  text: string
): Promise<void> {
  const embedding = await generateEmbedding(text)

  const { error } = await supabaseAdmin
    .from(table)
    .update({
      embedding: JSON.stringify(embedding),
      embedding_updated_at: new Date().toISOString(),
    })
    .eq('id', recordId)

  if (error) {
    throw new Error(`Failed to store embedding: ${error.message}`)
  }
}

/**
 * Batch update embeddings for records missing them
 */
export async function backfillEmbeddings(
  table: EmbeddingTarget,
  textColumn: string,
  batchSize = 50
): Promise<{
  processed: number
  errors: number
  quotaErrors: number
  providerConfigErrors: number
}> {
  let processed = 0
  let errors = 0
  let quotaErrors = 0
  let providerConfigErrors = 0

  // Get records that need embedding backfill.
  // Primary signal: embedding_updated_at is null.
  // Compatibility: also include rows where embedding is null.
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(`id, ${textColumn}`)
    .or('embedding_updated_at.is.null,embedding.is.null')
    .order('embedding_updated_at', { ascending: true, nullsFirst: true })
    .limit(batchSize)
  const records = data as Array<{ id: string } & Record<string, unknown>> | null

  if (error || !records) {
    throw new Error(`Failed to fetch records: ${error?.message}`)
  }

  for (const record of records) {
    try {
      const text = record[textColumn as keyof typeof record] as string
      if (text) {
        await storeEmbedding(table, record.id, text)
        processed++
      }
    } catch (err) {
      console.error(`Failed to embed ${table}/${record.id}:`, err)
      errors++
      if (err instanceof EmbeddingQuotaExceededError) {
        quotaErrors++
      }
      if (err instanceof EmbeddingProviderUnavailableError) {
        providerConfigErrors++
      }
    }

    // Rate limiting - avoid hitting API limits
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return { processed, errors, quotaErrors, providerConfigErrors }
}

// ═══════════════════════════════════════════════════════════════════════════
// Semantic Search Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Semantic search for tasks
 */
export async function searchTasks(
  query: string,
  options: {
    threshold?: number
    limit?: number
    categoryId?: string
  } = {}
): Promise<RAGContext['tasks']> {
  const { threshold = 0.7, limit = 10, categoryId } = options

  const embedding = await generateEmbedding(query)

  const { data, error } = await supabaseAdmin.rpc('match_tasks', {
    query_embedding: JSON.stringify(embedding),
    match_threshold: threshold,
    match_count: limit,
  })

  if (error) {
    throw new Error(`Task search failed: ${error.message}`)
  }

  let results = data || []
  if (categoryId) {
    results = results.filter((t: { category_id: string }) => t.category_id === categoryId)
  }

  return results
}

/**
 * Semantic search for craftsmen profiles
 */
export async function searchObrtniki(
  query: string,
  options: {
    threshold?: number
    limit?: number
    onlyAvailable?: boolean
  } = {}
): Promise<RAGContext['obrtniki']> {
  const { threshold = 0.7, limit = 10 } = options

  const embedding = await generateEmbedding(query)

  const { data, error } = await supabaseAdmin.rpc('match_obrtniki', {
    query_embedding: JSON.stringify(embedding),
    match_threshold: threshold,
    match_count: limit,
  })

  if (error) {
    throw new Error(`Obrtniki search failed: ${error.message}`)
  }

  return data || []
}

/**
 * Semantic search within conversation messages
 */
export async function searchMessages(
  query: string,
  conversationId?: string,
  options: {
    threshold?: number
    limit?: number
  } = {}
): Promise<RAGContext['messages']> {
  const { threshold = 0.6, limit = 20 } = options

  const embedding = await generateEmbedding(query)

  const { data, error } = await supabaseAdmin.rpc('match_sporocila', {
    query_embedding: JSON.stringify(embedding),
    conversation_id: conversationId || null,
    match_threshold: threshold,
    match_count: limit,
  })

  if (error) {
    throw new Error(`Message search failed: ${error.message}`)
  }

  return data || []
}

/**
 * Semantic search for offers
 */
export async function searchOffers(
  query: string,
  taskId?: string,
  options: {
    threshold?: number
    limit?: number
  } = {}
): Promise<RAGContext['offers']> {
  const { threshold = 0.6, limit = 10 } = options

  const embedding = await generateEmbedding(query)

  const { data, error } = await supabaseAdmin.rpc('match_ponudbe', {
    query_embedding: JSON.stringify(embedding),
    task_id: taskId || null,
    match_threshold: threshold,
    match_count: limit,
  })

  if (error) {
    throw new Error(`Offer search failed: ${error.message}`)
  }

  return data || []
}

// ═══════════════════════════════════════════════════════════════════════════
// RAG Context Building
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build comprehensive RAG context for an AI agent
 */
export async function buildRAGContext(
  query: string,
  options: {
    includeTasks?: boolean
    includeObrtniki?: boolean
    includeMessages?: boolean
    includeOffers?: boolean
    conversationId?: string
    taskId?: string
    maxPerSource?: number
  } = {}
): Promise<RAGContext> {
  const {
    includeTasks = true,
    includeObrtniki = true,
    includeMessages = false,
    includeOffers = false,
    conversationId,
    taskId,
    maxPerSource = 5,
  } = options

  const context: RAGContext = {}
  const promises: Promise<void>[] = []

  if (includeTasks) {
    promises.push(
      searchTasks(query, { limit: maxPerSource })
        .then((results) => {
          context.tasks = results
        })
        .catch((e) => console.warn('RAG task search failed:', e))
    )
  }

  if (includeObrtniki) {
    promises.push(
      searchObrtniki(query, { limit: maxPerSource })
        .then((results) => {
          context.obrtniki = results
        })
        .catch((e) => console.warn('RAG obrtniki search failed:', e))
    )
  }

  if (includeMessages && conversationId) {
    promises.push(
      searchMessages(query, conversationId, { limit: maxPerSource })
        .then((results) => {
          context.messages = results
        })
        .catch((e) => console.warn('RAG message search failed:', e))
    )
  }

  if (includeOffers && taskId) {
    promises.push(
      searchOffers(query, taskId, { limit: maxPerSource })
        .then((results) => {
          context.offers = results
        })
        .catch((e) => console.warn('RAG offers search failed:', e))
    )
  }

  await Promise.allSettled(promises)

  return context
}

/**
 * Format RAG context for inclusion in AI prompt
 */
export function formatRAGContextForPrompt(context: RAGContext): string {
  const sections: string[] = []

  if (context.tasks?.length) {
    sections.push(
      `## Podobna povpraševanja:\n${context.tasks
        .map(
          (t) =>
            `- ${t.title} (podobnost: ${(t.similarity * 100).toFixed(0)}%): ${t.description?.slice(0, 200)}...`
        )
        .join('\n')}`
    )
  }

  if (context.obrtniki?.length) {
    sections.push(
      `## Relevantni mojstri:\n${context.obrtniki
        .map(
          (o) =>
            `- ${o.business_name} (podobnost: ${(o.similarity * 100).toFixed(0)}%): ${o.description?.slice(0, 200)}...`
        )
        .join('\n')}`
    )
  }

  if (context.messages?.length) {
    sections.push(
      `## Pretekli pogovori:\n${context.messages
        .map((m) => `- [${m.created_at}]: ${m.message.slice(0, 150)}...`)
        .join('\n')}`
    )
  }

  if (context.offers?.length) {
    sections.push(
      `## Podobne ponudbe:\n${context.offers
        .map((o) => `- €${o.price_estimate}: ${o.message?.slice(0, 150)}...`)
        .join('\n')}`
    )
  }

  return sections.length ? `\n<context>\n${sections.join('\n\n')}\n</context>\n` : ''
}
