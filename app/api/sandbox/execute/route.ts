import { NextRequest, NextResponse } from 'next/server'
import { validateAIRequest } from '@/lib/ai/ai-security-middleware'
import { executeSandboxCode, SandboxPolicyError } from '@/lib/services/e2b-sandbox'

export async function POST(req: NextRequest) {
  try {
    const security = await validateAIRequest(req)
    if ('error' in security) return security.error

    const body = await req.json()
    const code = typeof body?.code === 'string' ? body.code : ''
    const language = body?.language
    const sandboxId = typeof body?.sandboxId === 'string' ? body.sandboxId : undefined

    const result = await executeSandboxCode({
      userId: security.context.userId,
      tier: security.context.tier,
      code,
      language,
      sandboxId,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof SandboxPolicyError) {
      return NextResponse.json({
        ok: false,
        error: error.message,
        canonical_error: { code: error.reason, message: error.message },
      }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : 'Napaka pri izvajanju kode.'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
