import { Sandbox } from 'e2b'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

const templateMap = {
  python: 'base',
  nodejs: 'base',
} as const

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

    const { code, language, sandboxId } = await req.json()

    if (!process.env.E2B_API_KEY) {
      return NextResponse.json({ error: 'E2B_API_KEY manjka v okolju.' }, { status: 500 })
    }

    let sandbox: Sandbox

    if (sandboxId) {
      sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
    } else {
      sandbox = await Sandbox.create(templateMap[language as keyof typeof templateMap] ?? 'base', {
        apiKey: process.env.E2B_API_KEY,
      })
    }

    const command = language === 'python' ? `python -c ${JSON.stringify(code)}` : `node -e ${JSON.stringify(code)}`

    const execution = await sandbox.commands.run(command, {
      timeoutMs: 120000,
      onStdout(data: { line: string }) {
        void data
      },
      onStderr(data: { line: string }) {
        void data
      },
    })

    return NextResponse.json({
      sandboxId: sandbox.sandboxId,
      stdout: execution.stdout,
      stderr: execution.stderr,
      exitCode: execution.exitCode,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Napaka pri izvajanju kode.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
