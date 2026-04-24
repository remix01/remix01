/**
 * Cron Job: Embedding Backfill
 *
 * Automatically generates embeddings for new records.
 * Triggered by Vercel Cron or QStash scheduler.
 *
 * Schedule: Every 15 minutes
 * Configure in vercel.json with cron schedule: 0 [slash]15 [space] [asterisk] [space] [asterisk] [space] [asterisk] [space] [asterisk]
 */

import { NextRequest } from 'next/server'
import { env, hasEmbeddings } from '@/lib/env'
import { fail } from '@/lib/http/response'
import { backfillEmbeddings, type EmbeddingTarget } from '@/lib/ai/rag'

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = env.CRON_SECRET

  if (!cronSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[v0] CRON_SECRET not configured in production — request denied')
      return false
    }
    return true
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return fail('Unauthorized', 401)
  }

  const startTime = Date.now()
  const results: Record<
    string,
    { processed: number; errors: number; quotaErrors: number; providerConfigErrors: number }
  > = {}

  if (!hasEmbeddings()) {
    return fail('No embedding provider configured (OPENAI_API_KEY, VOYAGE_API_KEY, GEMINI_API_KEY)', 500, {
      skipped: true,
      timestamp: new Date().toISOString(),
    })
  }

  // Hard limit per cron execution to avoid exhausting embedding quotas in one run.
  const maxRecordsPerRun = Number(env.EMBEDDING_BACKFILL_MAX_PER_RUN ?? 10)
  let remainingBudget = Number.isFinite(maxRecordsPerRun) && maxRecordsPerRun > 0
    ? Math.floor(maxRecordsPerRun)
    : 10

  // Tables and their text columns for embedding.
  // perTableLimit is a cap, final processed rows are also constrained by remainingBudget.
  const targets: Array<{ table: EmbeddingTarget; textColumn: string; batchSize: number }> = [
    { table: 'tasks', textColumn: 'description', batchSize: 5 },
    { table: 'obrtnik_profiles', textColumn: 'description', batchSize: 3 },
    { table: 'ponudbe', textColumn: 'message', batchSize: 1 },
    { table: 'sporocila', textColumn: 'message', batchSize: 1 },
  ]

  for (const target of targets) {
    if (remainingBudget <= 0) {
      results[target.table] = { processed: 0, errors: 0, quotaErrors: 0, providerConfigErrors: 0 }
      continue
    }

    const targetBatchSize = Math.min(target.batchSize, remainingBudget)

    try {
      const result = await backfillEmbeddings(target.table, target.textColumn, targetBatchSize)
      results[target.table] = result
      remainingBudget -= result.processed + result.errors
    } catch (error) {
      console.error(`Backfill error for ${target.table}:`, error)
      results[target.table] = { processed: 0, errors: 1, quotaErrors: 0, providerConfigErrors: 0 }
      remainingBudget -= 1
    }
  }

  const totalProcessed = Object.values(results).reduce((sum, r) => sum + r.processed, 0)
  const totalErrors = Object.values(results).reduce((sum, r) => sum + Math.max(0, r.errors), 0)
  const totalQuotaErrors = Object.values(results).reduce((sum, r) => sum + r.quotaErrors, 0)
  const totalProviderConfigErrors = Object.values(results).reduce(
    (sum, r) => sum + r.providerConfigErrors,
    0
  )
  const durationMs = Date.now() - startTime
  const statusCode = totalProviderConfigErrors > 0 ? 500 : totalQuotaErrors > 0 ? 429 : 200

  console.log(
    `[Cron] Embedding backfill complete: ${totalProcessed} processed, ${totalErrors} errors in ${durationMs}ms`
  )

  return Response.json({
    success: statusCode === 200,
    results,
    summary: {
      maxRecordsPerRun: maxRecordsPerRun > 0 ? Math.floor(maxRecordsPerRun) : 10,
      totalProcessed,
      totalErrors,
      totalQuotaErrors,
      totalProviderConfigErrors,
      durationMs,
    },
    timestamp: new Date().toISOString(),
  }, { status: statusCode })
}

// Also support POST for QStash
export async function POST(request: NextRequest) {
  return GET(request)
}
