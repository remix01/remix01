import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, fail } from '@/lib/http/response'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return fail('Unauthorized', 401)
    }

    const body = await req.json()
    const {
      ponudba_id,
      obrtnik_id,
      rating,
      quality_rating,
      punctuality_rating,
      price_rating,
      comment,
      photos,
    } = body

    // Validacija
    if (!ponudba_id || !obrtnik_id || !rating) {
      return fail('Missing required fields', 400)
    }

    if (rating < 1 || rating > 5) {
      return fail('Invalid rating', 400)
    }

    // Check if ponudba exists and belongs to this narocnik
    const { data: ponudba, error: ponudbaError } = await supabaseAdmin
      .from('ponudbe')
      .select('id, povprasevanja(narocnik_id)')
      .eq('id', ponudba_id)
      .single()

    if (ponudbaError || !ponudba) {
      return fail('Ponudba not found', 404)
    }

    const povprasevanjeNarocnikId = (ponudba.povprasevanja as any)?.[0]?.narocnik_id
    if (povprasevanjeNarocnikId !== user.id) {
      return fail('Forbidden', 403)
    }

    // Check if review already exists
    const { data: existingReview } = await supabaseAdmin
      .from('ocene')
      .select('id')
      .eq('ponudba_id', ponudba_id)
      .single()

    if (existingReview) {
      return fail('Review already exists', 409)
    }

    // Insert review
    const { data: review, error: insertError } = await supabaseAdmin
      .from('ocene')
      .insert({
        ponudba_id,
        obrtnik_id,
        narocnik_id: user.id,
        rating,
        quality_rating: quality_rating || null,
        punctuality_rating: punctuality_rating || null,
        price_rating: price_rating || null,
        comment: comment || null,
        photos: photos || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[v0] Insert error:', insertError)
      return fail('Failed to create review', 500)
    }

    // Create notification for craftsman
    await supabaseAdmin.from('notifications').insert({
      user_id: obrtnik_id,
      type: 'nova_ocena',
      title: 'Prejeli ste novo oceno!',
      message: `Obrnočnik vam je dal oceno ${rating} ⭐`,
      action_url: '/partner-dashboard/ocene',
      is_read: false,
    })

    return ok({ success: true, ocena_id: review.id })
  } catch (err) {
    console.error('[v0] Error:', err)
    return fail('Internal error', 500)
  }
}
