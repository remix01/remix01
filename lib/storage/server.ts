/**
 * Server-side storage factory.
 *
 * Usage (server components / API routes / server actions):
 *
 *   import { getStorageProvider } from '@/lib/storage/server'
 *   const storage = getStorageProvider()
 *   const { url, error } = await storage.upload({ bucket, path, body, contentType })
 *
 * Provider selection:
 *   STORAGE_PROVIDER=minio   → MinIO (self-hosted, Docker)
 *   STORAGE_PROVIDER=supabase → Supabase Storage (default / production)
 *
 * Server-side only – do NOT import in 'use client' modules.
 */

import type { StorageProvider } from './types'
import { env } from '@/lib/env'

let _provider: StorageProvider | null = null

export function getStorageProvider(): StorageProvider {
  if (_provider) return _provider

  const name = (env.STORAGE_PROVIDER || 'supabase') as 'minio' | 'supabase'

  if (name === 'minio') {
    const { MinioProvider } = require('./providers/minio') as typeof import('./providers/minio')
    _provider = new MinioProvider({
      endpoint: env.MINIO_ENDPOINT,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
      region: env.MINIO_REGION || 'us-east-1',
      publicUrl: env.MINIO_PUBLIC_URL || env.MINIO_ENDPOINT,
    })
  } else {
    const { SupabaseStorageProvider } = require('./providers/supabase') as typeof import('./providers/supabase')
    _provider = new SupabaseStorageProvider()
  }

  return _provider
}

/** Reset singleton – useful in tests */
export function resetStorageProvider(): void {
  _provider = null
}

// Re-export types for convenience
export type { StorageProvider, UploadInput, StorageResult, PresignResult } from './types'
export { PUBLIC_BUCKETS, PRIVATE_BUCKETS, ALL_BUCKETS } from './types'
