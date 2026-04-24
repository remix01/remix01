'use server'

import { isStructuredError } from '@/lib/utils/error'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { matchObrtnikiForPovprasevanje } from '@/lib/agent/liftgo-agent'
import { runGuardrails } from '@/lib/agent/guardrails'
import type { Role } from '@/lib/agent/permissions'
import { ok, fail } from '@/lib/http/response'

export async function POST(request: NextRequest) {
  try {
    const { povprasevanjeId } = await request.json()

    if (!povprasevanjeId) {
      return fail('povprasevanjeId je obvezen', 400)
    }

    // 1. Verify auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return fail('Niste prijavljeni', 401)
    }

    // 2. Get user profile with role
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const profile = profileData as { role: string | null } | null

    if (!profile) {
      return fail('Forbidden', 403)
    }

    // 3. Build session for guardrails
    const session = {
      user: {
        id: user.id,
        email: user.email,
        role: (profile.role === 'narocnik' ? 'user' : 'partner') as Role,
      },
    }

    // 4. Run guardrails (permissions, schema, injection, amounts, rate limit)
    try {
      await runGuardrails('agent.match', { povprasevanjeId }, session)
    } catch (error: unknown) {
      return fail(isStructuredError(error) ? error.error : 'Forbidden', isStructuredError(error) ? error.code : 403)
    }

    // 5. Verify ownership (redundant with guardrails but keeping for clarity)
    const { data: povprasevanje } = await supabase
      .from('povprasevanja')
      .select('narocnik_id')
      .eq('id', povprasevanjeId)
      .single()

    if (!povprasevanje || povprasevanje.narocnik_id !== user.id) {
      return fail('Nimate dostopa do tega povpraševanja', 403)
    }

    // 4. Call agent
    const result = await matchObrtnikiForPovprasevanje(povprasevanjeId)

    if (result.error) {
      return fail(result.error, 500)
    }

    // 5. Save results to Supabase
    const { error: insertError } = await supabase
      .from('agent_matches' as any)
      .insert({
        povprasevanje_id: povprasevanjeId,
        matches: result.topMatches,
        reasoning: result.reasoning,
        created_at: new Date().toISOString(),
      } as any)

    if (insertError) {
      console.error('[v0] Error saving matches:', insertError)
      // Don't fail the response, still return the matches
    }

    return ok({
      matches: result.topMatches,
      reasoning: result.reasoning,
    })
  } catch (error) {
    console.error('[v0] Agent API error:', error)
    return fail('Napaka pri iskanju obrtnov', 500)
  }
}
