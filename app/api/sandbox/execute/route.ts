import { createHmac, timingSafeEqual } from 'node:crypto'
import { Sandbox } from 'e2b'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

const templateMap = {
  python: 'base',
  nodejs: 'base',
} as const

const SANDBOX_TOKEN_TTL_SECONDS = 60 * 60 * 8

function createSandboxToken(sandboxId: string, userId: string) {
  const secret = process.env.SANDBOX_OWNER_SECRET || process.env.SUPABASE_JWT_SECRET || process.env.E2B_API_KEY
  if (!secret) throw new Error('Missing SANDBOX_OWNER_SECRET (or SUPABASE_JWT_SECRET).')

  const exp = Math.floor(Date.now() / 1000) + SANDBOX_TOKEN_TTL_SECONDS
  const payload = `${sandboxId}.${userId}.${exp}`
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function verifySandboxToken(token: string, sandboxId: string, userId: string) {
  const secret = process.env.SANDBOX_OWNER_SECRET || process.env.SUPABASE_JWT_SECRET || process.env.E2B_API_KEY
  if (!secret) return false

  const parts = token.split('.')
  if (parts.length < 4) return false

  const [tokenSandboxId, tokenUserId, expRaw, signature] = parts
  const payload = `${tokenSandboxId}.${tokenUserId}.${expRaw}`
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (signatureBuffer.length != expectedBuffer.length) return false
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return false
  if (tokenSandboxId !== sandboxId || tokenUserId !== userId) return false

  const exp = Number(expRaw)
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false

  return true
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code, language, sandboxId, sandboxToken } = await req.json()

    if (!process.env.E2B_API_KEY) {
      return NextResponse.json({ error: 'E2B_API_KEY manjka v okolju.' }, { status: 500 })
    }

    let sandbox: Sandbox
    let nextSandboxId: string

    if (sandboxId) {
      if (!sandboxToken || !verifySandboxToken(sandboxToken, sandboxId, user.id)) {
        return NextResponse.json({ error: 'Sandbox ni v vaši lasti.' }, { status: 403 })
      }

      sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
      nextSandboxId = sandboxId
    } else {
      sandbox = await Sandbox.create(templateMap[language as keyof typeof templateMap] ?? 'base', {
        apiKey: process.env.E2B_API_KEY,
      })
      nextSandboxId = sandbox.sandboxId
    }

    const filePath = language === 'python' ? '/tmp/liftgo_sandbox.py' : '/tmp/liftgo_sandbox.js'
    await sandbox.files.write(filePath, code)

    const command = language === 'python' ? `python ${filePath}` : `node ${filePath}`

    const execution = await sandbox.commands.run(command, {
      timeoutMs: 120000,
      onStdout(data: string) {
        void data
      },
      onStderr(data: string) {
        void data
      },
    })

    return NextResponse.json({
      sandboxId: nextSandboxId,
      sandboxToken: createSandboxToken(nextSandboxId, user.id),
      stdout: execution.stdout,
      stderr: execution.stderr,
      exitCode: execution.exitCode,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Napaka pri izvajanju kode.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
