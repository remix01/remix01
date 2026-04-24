/**
 * Admin API — Test Anthropic API Key
 *
 * Makes a minimal Claude API call to verify the key is valid and the model is accessible.
 * Admin-only.
 */

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { withAdminAuth } from '@/lib/admin-auth'
import { ok, fail } from '@/lib/http/response'

async function handler(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return fail('ANTHROPIC_API_KEY ni nastavljen v okoljskih spremenljivkah.', 400)
    }

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Reply with just: OK' }],
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('')

    return ok({ message: `API ključ je veljaven. Model odgovor: "${text.trim()}"` })
  } catch (err: any) {
    console.error('[test-anthropic] error:', err)
    if (err instanceof Anthropic.APIError) {
      if (err.status === 401) {
        return fail('Neveljaven API ključ (401). Preverite vrednost ANTHROPIC_API_KEY.', 400)
      }
      if (err.status === 403) {
        return fail('Dostop zavrnjen (403). API ključ nima dostopa do modela.', 400)
      }
      return fail(`Anthropic napaka (${err.status}): ${err.message}`, 400)
    }
    return fail(err.message || 'Napaka pri testiranju.', 500)
  }
}

export const POST = withAdminAuth(handler)
