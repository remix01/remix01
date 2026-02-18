import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Nepooblaščen dostop' },
        { status: 401 }
      )
    }

    const token = params.token

    if (!token) {
      return NextResponse.json(
        { error: 'Token je obvezen' },
        { status: 400 }
      )
    }

    // Verify token belongs to current user before deactivating
    const { data: existingToken, error: fetchError } = await supabaseAdmin
      .from('device_tokens')
      .select('user_id')
      .eq('token', token)
      .single()

    if (fetchError || !existingToken) {
      return NextResponse.json(
        { error: 'Naprava ni najdena' },
        { status: 404 }
      )
    }

    if (existingToken.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Nimate dovoljenja za brisanje te naprave' },
        { status: 403 }
      )
    }

    // Deactivate the token
    const { error } = await supabaseAdmin
      .from('device_tokens')
      .update({ is_active: false })
      .eq('token', token)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Naprava je bila uspešno odstranjena',
    })
  } catch (error) {
    console.error('[Device Delete] Error:', error)
    return NextResponse.json(
      { error: 'Napaka pri brisanju naprave' },
      { status: 500 }
    )
  }
}
