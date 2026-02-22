import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPonudba } from '@/lib/dal/ponudbe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { povprasevanje_id, obrtnik_id, message, price_estimate, price_type, available_date } = await request.json()

    if (!povprasevanje_id || !obrtnik_id || !message || !price_estimate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify obrtnik owns this profile
    const { data: obrtnikProfile } = await supabase
      .from('obrtnik_profiles')
      .select('id')
      .eq('id', obrtnik_id)
      .eq('user_id', user.id)
      .single()

    if (!obrtnikProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Create ponudba
    const ponudba = await createPonudba({
      povprasevanje_id,
      obrtnik_id,
      message,
      price_estimate,
      price_type,
      available_date,
      status: 'poslana'
    })

    if (!ponudba) {
      return NextResponse.json({ error: 'Failed to create ponudba' }, { status: 500 })
    }

    return NextResponse.json({ success: true, ponudba })
  } catch (error) {
    console.error('[v0] Error creating ponudba:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
