import { env } from '@/lib/env'

export interface E2BExecutionResult {
  stdout: string
  stderr: string
  exitCode: number
}

interface SandboxExecution {
  text?: string
  logs?: {
    stdout?: string[]
    stderr?: string[]
  }
  error?: {
    message?: string
  }
}

function joinLogs(lines?: string[]): string {
  return (lines ?? []).join('\n').trim()
}

/**
 * Execute code in E2B code-interpreter sandbox via official SDK.
 * Requires E2B_API_KEY from environment variables.
 */
export async function runInE2B(code: string, language: 'python' | 'javascript' = 'python'): Promise<E2BExecutionResult> {
  if (!env.E2B_API_KEY) {
    throw new Error('E2B_API_KEY is missing. Set it in Vercel Environment Variables.')
  }

  const { Sandbox } = await import('@e2b/code-interpreter')
  const sandbox = await Sandbox.create({ apiKey: env.E2B_API_KEY })

  try {
    const execution = await sandbox.runCode(code, { language }) as SandboxExecution

    const stdoutLogs = joinLogs(execution.logs?.stdout)
    const resultText = execution.text?.trim() ?? ''
    const stdout = stdoutLogs || resultText

    const stderrLogs = joinLogs(execution.logs?.stderr)
    const stderrError = execution.error?.message?.trim() ?? ''
    const stderr = stderrLogs || stderrError

    return {
      stdout,
      stderr,
      exitCode: execution.error ? 1 : 0,
    }
  } finally {
    await sandbox.kill()
  }
}
