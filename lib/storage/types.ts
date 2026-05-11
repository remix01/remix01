export type StorageProviderName = 'minio' | 'supabase'

export interface UploadInput {
  bucket: string
  path: string
  body: Buffer | Uint8Array | ReadableStream | Blob
  contentType: string
  /** Set to true for buckets that serve public files */
  isPublic?: boolean
  /** Original file size in bytes – used for validation */
  size?: number
  /** Additional metadata stored with the object */
  metadata?: Record<string, string>
}

export interface StorageResult {
  url: string | null
  path: string | null
  error: string | null
}

export interface PresignResult {
  uploadUrl: string
  publicUrl: string
  path: string
  expiresAt: number
}

export interface StorageProvider {
  name: StorageProviderName
  /** Server-side upload – used from API routes and server actions */
  upload(input: UploadInput): Promise<StorageResult>
  /** Delete an object */
  delete(bucket: string, path: string): Promise<{ error: string | null }>
  /** Return a time-limited signed URL for a private object */
  getSignedUrl(bucket: string, path: string, expiresInSeconds?: number): Promise<string>
  /** Return the permanent public URL for a public object */
  getPublicUrl(bucket: string, path: string): string
  /** Generate a presigned PUT URL for direct browser-to-storage upload */
  presignUpload(bucket: string, path: string, contentType: string, expiresInSeconds?: number): Promise<PresignResult>
}

/** Buckets that should be publicly readable without authentication */
export const PUBLIC_BUCKETS = new Set([
  'agent-uploads',
  'inquiry-attachments',
  'chat-attachments',
  'portfolio',
  'mojster-galerija',
  'profilne-slike',
])

/** Buckets that require authentication to read */
export const PRIVATE_BUCKETS = new Set([
  'task-images',
  'mojster-certifikati',
])

export const ALL_BUCKETS = [...PUBLIC_BUCKETS, ...PRIVATE_BUCKETS] as const
