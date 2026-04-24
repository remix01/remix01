import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, fail } from '@/lib/http/response'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return fail('Nepooblaščen dostop', 401)
    }

    const { token } = await params

    if (!token) {
      return fail('Token je obvezen', 400)
    }

    // Verify token belongs to current user before deactivating
    const { data: existingToken, error: fetchError } = await supabaseAdmin
      .from('device_tokens')
      .select('user_id')
      .eq('token', token)
      .single()

    if (fetchError || !existingToken) {
      return fail('Naprava ni najdena', 404)
    }

    if (existingToken.user_id !== user.id) {
      return fail('Nimate dovoljenja za brisanje te naprave', 403)
    }

    // Deactivate the token
    const { error } = await supabaseAdmin
      .from('device_tokens')
      .update({ is_active: false })
      .eq('token', token)

    if (error) {
      throw error
    }

    return ok({
      success: true,
      message: 'Naprava je bila uspešno odstranjena',
    })
  } catch (error) {
    console.error('[Device Delete] Error:', error)
    return fail('Napaka pri brisanju naprave', 500)
  }
}
