import { env } from '@/lib/env'

export interface E2BExecutionResult {
  stdout: string
  stderr: string
  exitCode: number
}

// v2 Execution shape from @e2b/code-interpreter
interface E2BExecution {
  logs: { stdout: string[]; stderr: string[] }
  error: { name: string; value: string; traceback: string[] } | null
}

export async function runInE2B(code: string, _language: 'python' | 'javascript' = 'python'): Promise<E2BExecutionResult> {
  if (!env.E2B_API_KEY) {
    throw new Error('E2B_API_KEY is missing. Set it in Vercel Environment Variables.')
  }

  const { Sandbox } = await import('@e2b/code-interpreter')
  const sandbox = await Sandbox.create({ apiKey: env.E2B_API_KEY })

  try {
    // v2: runCode returns Execution with logs.stdout[]/logs.stderr[] arrays;
    // language is determined by the sandbox template, not a runCode option.
    const execution = await sandbox.runCode(code) as E2BExecution

    return {
      stdout: execution.logs.stdout.join('\n'),
      stderr: execution.logs.stderr.join('\n'),
      exitCode: execution.error ? 1 : 0,
    }
  } finally {
    await sandbox.kill()
  }
}
