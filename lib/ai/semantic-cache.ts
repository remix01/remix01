/**
 * Semantic Cache for LiftGO AI
 *
 * Vector-similarity cache: before calling LLM, embed the user message and
 * search for a cached response with similarity >= threshold. If found,
 * return instantly. Otherwise call LLM and store the result.
 *
 * Storage: Redis (Upstash) for response text + TTL, pgvector for embeddings.
 * Falls back gracefully — cache miss just calls LLM normally.
 */

import { Redis } from '@upstash/redis'
import { generateEmbedding } from './rag'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

const SIMILARITY_THRESHOLD = 0.95
const CACHE_TTL_SECONDS = 12 * 60 * 60 // 12 hours
const MAX_CACHED_RESPONSE_LENGTH = 10_000

const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  env.SUPABASE_SERVICE_ROLE_KEY || 'development-service-role-key'
)

let _redis: Redis | null = null
let _redisDisabled = false

function getRedis(): Redis | null {
  if (_redisDisabled) return null
  if (_redis) return _redis
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  try {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    return _redis
  } catch {
    return null
  }
}

export interface SemanticCacheResult {
  hit: boolean
  response: string | null
  similarity?: number
  cacheId?: string
}

/**
 * Look up a semantically similar cached response.
 * Returns { hit: true, response } on cache hit, { hit: false } on miss.
 */
export async function getSemanticCachedResponse(
  userMessage: string,
  agentType: string
): Promise<SemanticCacheResult> {
  try {
    const embedding = await generateEmbedding(userMessage)

    const { data, error } = await supabaseAdmin.rpc('match_semantic_cache', {
      query_embedding: JSON.stringify(embedding),
      agent_type_filter: agentType,
      match_threshold: SIMILARITY_THRESHOLD,
      match_count: 1,
    })

    if (error || !data || data.length === 0) {
      return { hit: false, response: null }
    }

    const match = data[0]
    const cacheKey = `sem_cache:${match.id}`

    const redis = getRedis()
    if (redis) {
      const cachedResponse = await redis.get<string>(cacheKey)
      if (cachedResponse) {
        return {
          hit: true,
          response: cachedResponse,
          similarity: match.similarity,
          cacheId: match.id,
        }
      }
    }

    if (match.response_text) {
      return {
        hit: true,
        response: match.response_text,
        similarity: match.similarity,
        cacheId: match.id,
      }
    }

    return { hit: false, response: null }
  } catch (err) {
    console.warn('[SemanticCache] Lookup failed, proceeding without cache:', err)
    return { hit: false, response: null }
  }
}

/**
 * Store a response in the semantic cache for future lookups.
 */
export async function setSemanticCachedResponse(
  userMessage: string,
  agentType: string,
  response: string
): Promise<void> {
  if (response.length > MAX_CACHED_RESPONSE_LENGTH) return

  try {
    const embedding = await generateEmbedding(userMessage)

    const { data: inserted, error } = await supabaseAdmin
      .from('semantic_cache')
      .insert({
        user_message: userMessage.slice(0, 500),
        agent_type: agentType,
        response_text: response,
        embedding: JSON.stringify(embedding),
      })
      .select('id')
      .single()

    if (error) {
      console.warn('[SemanticCache] Insert failed:', error.message)
      return
    }

    const redis = getRedis()
    if (redis && inserted?.id) {
      await redis.set(`sem_cache:${inserted.id}`, response, { ex: CACHE_TTL_SECONDS }).catch(() => {})
    }
  } catch (err) {
    console.warn('[SemanticCache] Store failed:', err)
  }
}
