'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { matchObrtnikiForPovprasevanje } from '@/lib/agent/liftgo-agent'

export async function POST(request: NextRequest) {
  try {
    const { povprasevanjeId } = await request.json()

    if (!povprasevanjeId) {
      return NextResponse.json(
        { error: 'povprasevanjeId je obvezen' },
        { status: 400 }
      )
    }

    // 1. Verify auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Niste prijavljeni' },
        { status: 401 }
      )
    }

    // 2. Verify role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'narocnik') {
      return NextResponse.json(
        { error: 'Samo naročniki imajo dostop' },
        { status: 403 }
      )
    }

    // 3. Verify ownership
    const { data: povprasevanje } = await supabase
      .from('povprasevanja')
      .select('narocnik_id')
      .eq('id', povprasevanjeId)
      .single()

    if (!povprasevanje || povprasevanje.narocnik_id !== user.id) {
      return NextResponse.json(
        { error: 'Nimate dostopa do tega povpraševanja' },
        { status: 403 }
      )
    }

    // 4. Call agent
    const result = await matchObrtnikiForPovprasevanje(povprasevanjeId)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // 5. Save results to Supabase
    const { error: insertError } = await supabase
      .from('agent_matches')
      .insert({
        povprasevanje_id: povprasevanjeId,
        matches: result.topMatches,
        reasoning: result.reasoning,
        created_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('[v0] Error saving matches:', insertError)
      // Don't fail the response, still return the matches
    }

    return NextResponse.json({
      matches: result.topMatches,
      reasoning: result.reasoning,
    })
  } catch (error) {
    console.error('[v0] Agent API error:', error)
    return NextResponse.json(
      { error: 'Napaka pri iskanju obrtnov' },
      { status: 500 }
    )
  }
}
