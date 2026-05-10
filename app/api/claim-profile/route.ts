import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email_confirmed_at) {
    return NextResponse.json({ error: 'Za prevzem profila je potrebna prijava in potrjen email.' }, { status: 401 })
  }

  const body = await req.json()
  const profileId = body?.profileId as string | undefined
  if (!profileId) return NextResponse.json({ error: 'profileId is required' }, { status: 400 })

  const { data: existing, error: readError } = await supabase
    .from('obrtnik_profiles')
    .select('id, profile_status, is_claimed')
    .eq('id', profileId)
    .single()

  if (readError || !existing) return NextResponse.json({ error: 'Profil ne obstaja.' }, { status: 404 })
  if (existing.profile_status !== 'lead') return NextResponse.json({ error: 'Profil je že prevzet.' }, { status: 409 })

  const { error: updateError } = await supabase
    .from('obrtnik_profiles')
    .update({ profile_status: 'claimed', is_claimed: true, is_verified: false, verification_status: 'pending' })
    .eq('id', profileId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true, status: 'claimed' })
}
