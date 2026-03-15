import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { obrtnik_reply } = await req.json()

    if (!obrtnik_reply) {
      return NextResponse.json({ error: 'Reply text required' }, { status: 400 })
    }

    // Get review and verify ownership
    const { data: review, error: getError } = await supabaseAdmin
      .from('ocene')
      .select('id, obrtnik_id')
      .eq('id', id)
      .single()

    if (getError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    if (review.obrtnik_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update review with reply
    const { error: updateError } = await supabaseAdmin
      .from('ocene')
      .update({
        obrtnik_reply,
        replied_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[v0] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
