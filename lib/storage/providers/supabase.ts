/**
 * Supabase Storage provider – server-side, uses the admin client (service role).
 * Server-side only: never import in client components or pages.
 */
import { createClient } from '@supabase/supabase-js'
import type { StorageProvider, UploadInput, StorageResult, PresignResult } from '../types'
import { env } from '@/lib/env'

function getAdminClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export class SupabaseStorageProvider implements StorageProvider {
  readonly name = 'supabase' as const

  async upload(input: UploadInput): Promise<StorageResult> {
    const supabase = getAdminClient()
    try {
      let body: Buffer | Uint8Array | Blob | ReadableStream
      if (input.body instanceof ReadableStream) {
        // Supabase JS client expects a Blob/File/Buffer, not a ReadableStream
        const chunks: Uint8Array[] = []
        const reader = input.body.getReader()
        let done = false
        while (!done) {
          const result = await reader.read()
          done = result.done
          if (result.value) chunks.push(result.value)
        }
        body = Buffer.concat(chunks)
      } else {
        body = input.body
      }

      const { data, error } = await supabase.storage.from(input.bucket).upload(input.path, body, {
        contentType: input.contentType,
        upsert: false,
        metadata: input.metadata,
      })

      if (error) return { url: null, path: null, error: error.message }

      const { data: urlData } = supabase.storage.from(input.bucket).getPublicUrl(data.path)
      return { url: urlData.publicUrl, path: data.path, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Supabase upload failed'
      return { url: null, path: null, error: message }
    }
  }

  async delete(bucket: string, path: string): Promise<{ error: string | null }> {
    const supabase = getAdminClient()
    const { error } = await supabase.storage.from(bucket).remove([path])
    return { error: error?.message ?? null }
  }

  async getSignedUrl(bucket: string, path: string, expiresInSeconds = 3600): Promise<string> {
    const supabase = getAdminClient()
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
    if (error || !data?.signedUrl) throw new Error(error?.message || 'Failed to create signed URL')
    return data.signedUrl
  }

  getPublicUrl(bucket: string, path: string): string {
    const supabase = getAdminClient()
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  async presignUpload(
    bucket: string,
    path: string,
    _contentType: string,
    expiresInSeconds = 900
  ): Promise<PresignResult> {
    const supabase = getAdminClient()
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert: false })

    if (error || !data) throw new Error(error?.message || 'Failed to create presigned upload URL')

    const publicUrl = this.getPublicUrl(bucket, path)
    return {
      uploadUrl: data.signedUrl,
      publicUrl,
      path: data.path,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    }
  }
}
