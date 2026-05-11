/**
 * POST /api/storage/presign
 *
 * Generates a presigned PUT URL so the browser can upload directly to MinIO
 * or Supabase without streaming through Next.js.
 *
 * Request body:
 *   { bucket: string, path: string, contentType: string, size: number }
 *
 * Response:
 *   { uploadUrl: string, publicUrl: string, path: string, expiresAt: number }
 *
 * Security:
 *   - Requires authenticated session
 *   - Validates file type and size
 *   - Rate-limited: max 30 presign requests per minute per user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStorageProvider } from '@/lib/storage/server'
import { PUBLIC_BUCKETS, PRIVATE_BUCKETS, ALL_BUCKETS } from '@/lib/storage/types'
import { validateFile } from '@/lib/storage'

const ALLOWED_BUCKETS = new Set(ALL_BUCKETS)
const PRESIGN_TTL_SECONDS = 900 // 15 minutes

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { bucket?: string; path?: string; contentType?: string; size?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { bucket, path, contentType, size } = body

  // Validate bucket
  if (!bucket || !ALLOWED_BUCKETS.has(bucket as typeof ALL_BUCKETS[number])) {
    return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
  }

  if (!path || typeof path !== 'string' || path.length > 512) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  // Prevent path traversal
  if (path.includes('..') || path.startsWith('/')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  // Private buckets: path must start with "<userId>/" (slash required to prevent
  // prefix collisions such as "<userId>-other/..." matching another user's id)
  if (PRIVATE_BUCKETS.has(bucket)) {
    if (!path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Access denied to private bucket' }, { status: 403 })
    }
  }

  if (!contentType || typeof contentType !== 'string') {
    return NextResponse.json({ error: 'contentType is required' }, { status: 400 })
  }

  // size is mandatory – without it we cannot validate file limits and an
  // authenticated caller could obtain an unbounded upload URL.
  if (typeof size !== 'number' || size <= 0) {
    return NextResponse.json({ error: 'size (bytes) is required and must be a positive number' }, { status: 400 })
  }

  // Validate file type and size against configured limits
  const syntheticFile = new File([], 'upload', { type: contentType })
  Object.defineProperty(syntheticFile, 'size', { value: size })
  const validation = validateFile(syntheticFile)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 422 })
  }

  try {
    const storage = getStorageProvider()
    const result = await storage.presignUpload(bucket, path, contentType, PRESIGN_TTL_SECONDS)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[storage/presign] Error:', err)
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
  }
}
