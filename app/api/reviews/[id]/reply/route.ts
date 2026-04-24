import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, fail } from '@/lib/http/response'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return fail('Unauthorized', 401)
    }

    const { id } = await params
    const { obrtnik_reply } = await req.json()

    if (!obrtnik_reply) {
      return fail('Reply text required', 400)
    }

    // Get review and verify ownership
    const { data: review, error: getError } = await supabaseAdmin
      .from('ocene')
      .select('id, obrtnik_id')
      .eq('id', id)
      .single()

    if (getError || !review) {
      return fail('Review not found', 404)
    }

    if (review.obrtnik_id !== user.id) {
      return fail('Forbidden', 403)
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
      return fail('Failed to update', 500)
    }

    return ok({ success: true })
  } catch (err) {
    console.error('[v0] Error:', err)
    return fail('Internal error', 500)
  }
}
