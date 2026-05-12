import { env } from '@/lib/env'

const E2B_BASE_URL = process.env.E2B_BASE_URL ?? 'https://api.e2b.dev'

export interface E2BExecutionResult {
  stdout: string
  stderr: string
  exitCode: number
}

/**
 * Execute code in E2B sandbox via REST API.
 * Requires E2B_API_KEY from Vercel Environment Variables.
 */
export async function runInE2B(code: string, language: 'python' | 'javascript' = 'python'): Promise<E2BExecutionResult> {
  if (!env.E2B_API_KEY) {
    throw new Error('E2B_API_KEY is missing. Set it in Vercel Environment Variables.')
  }

  const response = await fetch(`${E2B_BASE_URL}/v1/sandboxes/code/execute`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.E2B_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, language }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`E2B execution failed (${response.status}): ${body}`)
  }

  const json = await response.json() as {
    stdout?: string
    stderr?: string
    exitCode?: number
  }

  return {
    stdout: json.stdout ?? '',
    stderr: json.stderr ?? '',
    exitCode: json.exitCode ?? 0,
  }
}
