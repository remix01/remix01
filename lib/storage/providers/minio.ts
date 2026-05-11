/**
 * MinIO storage provider – uses the AWS S3-compatible API.
 * Server-side only: never import in client components or pages.
 */
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { StorageProvider, UploadInput, StorageResult, PresignResult } from '../types'
import { PUBLIC_BUCKETS } from '../types'

function buildS3Client(endpoint: string, accessKey: string, secretKey: string, region: string): S3Client {
  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    // Required for MinIO – path-style addressing (bucket.host vs host/bucket)
    forcePathStyle: true,
  })
}

/** Build the public URL for an object served by MinIO.
 *  If MINIO_PUBLIC_URL is set (e.g. https://storage.liftgo.net), that is used;
 *  otherwise falls back to the raw endpoint.
 */
function buildPublicUrl(publicBase: string, bucket: string, path: string): string {
  const base = publicBase.replace(/\/$/, '')
  return `${base}/${bucket}/${path}`
}

/** JSON policy that grants anonymous read on every object in a bucket */
function publicReadPolicy(bucket: string): string {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicRead',
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  })
}

export class MinioProvider implements StorageProvider {
  readonly name = 'minio' as const

  private s3: S3Client
  private publicBase: string
  private endpoint: string

  constructor(opts: {
    endpoint: string
    accessKey: string
    secretKey: string
    region?: string
    publicUrl?: string
  }) {
    this.endpoint = opts.endpoint
    this.publicBase = opts.publicUrl || opts.endpoint
    this.s3 = buildS3Client(opts.endpoint, opts.accessKey, opts.secretKey, opts.region || 'us-east-1')
  }

  /** Ensure the bucket exists; create it if not and apply the correct policy. */
  async ensureBucket(bucket: string, isPublic = false): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucket }))
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: bucket }))
      if (isPublic) {
        await this.s3.send(
          new PutBucketPolicyCommand({ Bucket: bucket, Policy: publicReadPolicy(bucket) })
        )
      }
    }
  }

  async upload(input: UploadInput): Promise<StorageResult> {
    try {
      const isPublic = input.isPublic ?? PUBLIC_BUCKETS.has(input.bucket)
      await this.ensureBucket(input.bucket, isPublic)

      // For large files use multipart upload via @aws-sdk/lib-storage
      const upload = new Upload({
        client: this.s3,
        params: {
          Bucket: input.bucket,
          Key: input.path,
          Body: input.body as Buffer | Uint8Array | ReadableStream,
          ContentType: input.contentType,
          Metadata: input.metadata,
          // ACL is not set; bucket policy controls public access
        },
        queueSize: 4,
        partSize: 5 * 1024 * 1024, // 5 MB parts
        leavePartsOnError: false,
      })

      await upload.done()
      const url = this.getPublicUrl(input.bucket, input.path)
      return { url, path: input.path, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'MinIO upload failed'
      console.error('[minio] upload error:', message)
      return { url: null, path: null, error: message }
    }
  }

  async delete(bucket: string, path: string): Promise<{ error: string | null }> {
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: path }))
      return { error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'MinIO delete failed'
      return { error: message }
    }
  }

  async getSignedUrl(bucket: string, path: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: path })
    return awsGetSignedUrl(this.s3, command, { expiresIn: expiresInSeconds })
  }

  getPublicUrl(bucket: string, path: string): string {
    return buildPublicUrl(this.publicBase, bucket, path)
  }

  async presignUpload(
    bucket: string,
    path: string,
    contentType: string,
    expiresInSeconds = 900
  ): Promise<PresignResult> {
    const isPublic = PUBLIC_BUCKETS.has(bucket)
    await this.ensureBucket(bucket, isPublic)

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      ContentType: contentType,
    })

    const uploadUrl = await awsGetSignedUrl(this.s3, command, { expiresIn: expiresInSeconds })
    const publicUrl = this.getPublicUrl(bucket, path)

    return {
      uploadUrl,
      publicUrl,
      path,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    }
  }
}
