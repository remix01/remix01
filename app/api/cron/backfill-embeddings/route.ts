/**
 * Cron Job: Embedding Backfill
 *
 * Automatically generates embeddings for new records.
 * Triggered by Vercel Cron (nightly 02:00 UTC) or QStash scheduler.
 * Protected by CRON_SECRET + overlap lock + day-window via withCronGuard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { env, hasEmbeddings } from '@/lib/env'
import { backfillEmbeddings, type EmbeddingTarget } from '@/lib/ai/rag'
import { withCronGuard, cronWindow } from '@/lib/cron/cronGuard'

async function _handler(request: NextRequest) {
  const startTime = Date.now()
  const results: Record<
    string,
    { processed: number; errors: number; quotaErrors: number; providerConfigErrors: number }
  > = {}

  if (!hasEmbeddings()) {
    return NextResponse.json({
      success: false,
      skipped: true,
      reason: 'No embedding provider configured (OPENAI_API_KEY, VOYAGE_API_KEY, GEMINI_API_KEY)',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
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

  return NextResponse.json({
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

// Window TTL 82800s (23h) — prevents re-running the nightly job if Vercel retries.
// Lock TTL 1800s (30 min) — embedding calls can be slow at max batch size.
export const GET = withCronGuard(
  {
    jobName: 'backfill-embeddings',
    lockTtlSeconds: 1800,
    windowKey: cronWindow.day,
    windowTtlSeconds: 82800,
  },
  _handler,
)

// Also support POST for QStash
export const POST = GET
