/**
 * Cron Job: Embedding Backfill
 *
 * Automatically generates embeddings for new records.
 * Triggered by Vercel Cron or QStash scheduler.
 *
 * Schedule: Every 15 minutes
 * Configure in vercel.json with cron schedule: 0 [slash]15 [space] [asterisk] [space] [asterisk] [space] [asterisk] [space] [asterisk]
 */

import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { backfillEmbeddings, type EmbeddingTarget } from '@/lib/ai/rag'

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = env.CRON_SECRET

  // Allow if no secret is configured (dev mode) or if it matches
  if (!cronSecret) return true
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const results: Record<string, { processed: number; errors: number }> = {}

  // Tables and their text columns for embedding
  const targets: Array<{ table: EmbeddingTarget; textColumn: string; batchSize: number }> = [
    { table: 'tasks', textColumn: 'description', batchSize: 20 },
    { table: 'obrtnik_profiles', textColumn: 'description', batchSize: 10 },
    { table: 'ponudbe', textColumn: 'message', batchSize: 30 },
    { table: 'sporocila', textColumn: 'message', batchSize: 50 },
  ]

  for (const target of targets) {
    try {
      const result = await backfillEmbeddings(target.table, target.textColumn, target.batchSize)
      results[target.table] = result
    } catch (error) {
      console.error(`Backfill error for ${target.table}:`, error)
      results[target.table] = { processed: 0, errors: -1 }
    }
  }

  const totalProcessed = Object.values(results).reduce((sum, r) => sum + r.processed, 0)
  const totalErrors = Object.values(results).reduce((sum, r) => sum + Math.max(0, r.errors), 0)
  const durationMs = Date.now() - startTime

  console.log(
    `[Cron] Embedding backfill complete: ${totalProcessed} processed, ${totalErrors} errors in ${durationMs}ms`
  )

  return NextResponse.json({
    success: true,
    results,
    summary: {
      totalProcessed,
      totalErrors,
      durationMs,
    },
    timestamp: new Date().toISOString(),
  })
}

// Also support POST for QStash
export async function POST(request: NextRequest) {
  return GET(request)
}
