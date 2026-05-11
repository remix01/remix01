# MinIO / Storage Guide

LiftGO uses **Supabase Storage** in production (backed by S3-compatible storage).
For local development you can run **MinIO** as a drop-in replacement.

## Buckets

| Bucket | Visibility | Max file size | Allowed types |
|--------|-----------|--------------|---------------|
| `user-avatars` | Private | 2 MB | jpeg, png, webp |
| `chat-uploads` | Private | 10 MB | jpeg, png, webp, pdf |
| `ai-generated` | Private | 10 MB | jpeg, png, webp, pdf |

All buckets are **private** — access is via signed URLs only.

## Local development with MinIO

### 1. Start MinIO

```bash
docker compose -f compose-dev.yaml up minio -d
```

MinIO console: http://localhost:9001 (user: `minioadmin`, pass: `minioadmin`)
API endpoint: http://localhost:9000

### 2. Create buckets

```bash
# Using mc (MinIO client)
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/user-avatars
mc mb local/chat-uploads
mc mb local/ai-generated
```

### 3. Local env variables

Add to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
```

## Signed URL pattern (production)

Never expose bucket objects directly. Always generate a short-lived signed URL server-side:

```ts
const { data } = await supabase.storage
  .from('chat-uploads')
  .createSignedUrl(`${taskId}/${senderId}/${filename}`, 3600); // 1 hour
```

## RLS policies

Supabase Storage RLS is defined in:
`supabase/migrations/20260511_storage_rls_policies.sql`

- `user-avatars` — user reads/writes only their own `{user_id}/` folder
- `chat-uploads` — sender uploads; both task parties can read; stored as `{task_id}/{sender_id}/{file}`
- `ai-generated` — service role writes; owning user reads their `{user_id}/` folder
