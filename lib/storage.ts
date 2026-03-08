'use client'

import { createClient } from '@supabase/supabase-js'
import { env } from './env'

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) return { url: null, error: error.message }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return { url: urlData.publicUrl, error: null }
  } catch (err) {
    return { url: null, error: err instanceof Error ? err.message : 'Upload failed' }
  }
}

export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path])
    return { error: error?.message ?? null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Delete failed' }
  }
}

export function generateFilePath(userId: string, fileName: string): string {
  const ext = fileName.split('.').pop()
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${userId}/${timestamp}-${random}.${ext}`
}

export function uploadWithProgress(
  bucket: string,
  path: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<{ url: string | null; error: string | null }> {
  return new Promise((resolve) => {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`

    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status === 200) {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
        resolve({ url: publicUrl, error: null })
      } else {
        resolve({ url: null, error: `Upload failed: ${xhr.status}` })
      }
    }
    xhr.onerror = () => resolve({ url: null, error: 'Network error' })
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${anonKey}`)
    xhr.setRequestHeader('x-upsert', 'false')
    const formData = new FormData()
    formData.append('', file)
    xhr.send(formData)
  })
}

export const LIMITS = {
  video: { maxMB: 100, types: ['video/mp4', 'video/quicktime', 'video/avi', 'video/mov'] },
  image: { maxMB: 10, types: ['image/jpeg', 'image/png', 'image/webp'] },
  document: {
    maxMB: 5,
    types: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const isVideo = file.type.startsWith('video/')
  const isImage = file.type.startsWith('image/')
  const isDocument = file.type.includes('pdf') || file.type.includes('word')
  const limitKey = isVideo ? 'video' : isImage ? 'image' : isDocument ? 'document' : null

  if (!limitKey) return { valid: false, error: 'Nepodprt tip datoteke' }

  const limit = LIMITS[limitKey as keyof typeof LIMITS]
  if (file.size > limit.maxMB * 1024 * 1024)
    return { valid: false, error: `Datoteka je prevelika (max ${limit.maxMB}MB)` }

  return { valid: true }
}
