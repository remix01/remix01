/**
 * GitHub Webhook → Docs Automation
 *
 * Listens for GitHub push events on the remix01/remix01 repository.
 * When docs-related files change, Claude summarises the diff and
 * upserts the corresponding help article in Supabase.
 *
 * Setup in GitHub:
 *   Repo → Settings → Webhooks → Add webhook
 *   Payload URL: https://www.liftgo.net/api/webhooks/github
 *   Content type: application/json
 *   Secret: GITHUB_WEBHOOK_SECRET env var
 *   Events: Just the push event
 *
 * Env vars:
 *   GITHUB_WEBHOOK_SECRET  — signing secret set in GitHub webhook settings
 *   ANTHROPIC_API_KEY      — for summarisation
 *   GITHUB_PAT             — Personal Access Token to fetch file content
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Files that trigger a docs update when changed
const DOCS_PATTERNS = [
  /^docs\//,
  /^CLAUDE\.md$/,
  /README\.md$/,
  /CHANGELOG\.md$/,
  /^app\/.*\/page\.tsx$/,  // Page components often need help article sync
]

interface GitHubPushPayload {
  ref: string
  repository: { full_name: string }
  commits: Array<{
    id: string
    message: string
    added: string[]
    modified: string[]
    removed: string[]
    url: string
  }>
  sender: { login: string }
}

// ── Signature verification ───────────────────────────────────────────────────

function verifySignature(payload: string, signature: string | null): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret || !signature) return false

  const expected = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

// ── Fetch file content from GitHub ───────────────────────────────────────────

async function fetchFileContent(repo: string, path: string, ref: string): Promise<string> {
  const token = process.env.GITHUB_PAT
  const url = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${ref}`

  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) return ''

  const data = await res.json()
  if (data.encoding === 'base64' && data.content) {
    return Buffer.from(data.content, 'base64').toString('utf-8')
  }

  return ''
}

// ── Claude: generate help article ───────────────────────────────────────────

async function generateHelpArticle(params: {
  filePath: string
  fileContent: string
  commitMessage: string
}): Promise<{ title: string; content: string; slug: string } | null> {
  const client = new Anthropic()

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are updating LiftGO's help center. A file was changed in the codebase.

File: ${params.filePath}
Commit: ${params.commitMessage}

File content (first 2000 chars):
${params.fileContent.slice(0, 2000)}

Generate a concise help article in Slovenian that explains the relevant feature or change to end users (not developers). Output ONLY valid JSON:
{
  "title": "Short article title in Slovenian",
  "slug": "url-friendly-slug-in-slovenian",
  "content": "Help article text in Slovenian, 100-200 words, written for non-technical users. Use bullet points where helpful."
}`,
      },
    ],
  })

  try {
    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = request.headers.get('x-github-event')
  if (event !== 'push') {
    return NextResponse.json({ ok: true, skipped: `event=${event}` })
  }

  let payload: GitHubPushPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only process pushes to main
  if (payload.ref !== 'refs/heads/main') {
    return NextResponse.json({ ok: true, skipped: 'not main branch' })
  }

  const repo = payload.repository.full_name
  const changedFiles = payload.commits.flatMap((c) => [
    ...c.added,
    ...c.modified,
  ])

  // Filter to docs-relevant files
  const docsFiles = changedFiles.filter((f) =>
    DOCS_PATTERNS.some((p) => p.test(f))
  )

  if (docsFiles.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'no docs files changed' })
  }

  const results: Array<{ file: string; status: string }> = []

  for (const filePath of docsFiles.slice(0, 5)) { // Max 5 per push
    try {
      const content = await fetchFileContent(
        repo,
        filePath,
        payload.commits[payload.commits.length - 1].id
      )

      if (!content) {
        results.push({ file: filePath, status: 'skipped: empty' })
        continue
      }

      const commitMsg = payload.commits[0]?.message ?? 'Update'
      const article = await generateHelpArticle({
        filePath,
        fileContent: content,
        commitMessage: commitMsg,
      })

      if (!article) {
        results.push({ file: filePath, status: 'skipped: no article generated' })
        continue
      }

      await supabaseAdmin.from('help_articles').upsert(
        {
          slug: article.slug,
          title: article.title,
          content: article.content,
          source_file: filePath,
          last_commit: payload.commits[0]?.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slug' }
      )

      results.push({ file: filePath, status: 'updated' })
    } catch (err) {
      results.push({
        file: filePath,
        status: `error: ${err instanceof Error ? err.message : 'unknown'}`,
      })
    }
  }

  return NextResponse.json({ ok: true, processed: results })
}
