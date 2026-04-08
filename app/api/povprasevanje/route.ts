import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getOrCreateCategory } from '@/lib/dal/categories'
import { sendPushToObrtnikiByCategory } from '@/lib/push-notifications'
import { enqueue } from '@/lib/jobs/queue'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    // ── SECURITY: Verify user is authenticated ─────────────────────────────
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Map legacy field names to database column names
    // Support both old (storitev, lokacija, opis) and new (title, location_city, description) field names
    const title = body.title || body.storitev
    const locationCity = body.location_city || body.lokacija
    const description = body.description || body.opis

    // Extract other fields
    const {
      stranka_ime,
      stranka_email,
      stranka_telefon,
      obrtnik_id,
      termin_datum,
      termin_ura,
      category_id,
      categoryName,
      urgency,
      budget_min,
      budget_max,
      location_notes,
      preferred_date_from,
      preferred_date_to,
      attachment_urls
    } = body

    // Validate required fields
    if (!title || !locationCity) {
      return NextResponse.json(
        { error: 'Title and location are required' },
        { status: 400 }
      )
    }

    // Handle category auto-creation if categoryName provided
    let finalCategoryId = category_id
    if (categoryName && !finalCategoryId) {
      try {
        finalCategoryId = await getOrCreateCategory(categoryName, user.id)
      } catch (catError) {
        console.error('[v0] Error creating category:', catError)
        // Continue without category if creation fails
      }
    }

    // CRITICAL FIX: Always set narocnik_id from authenticated user
    // Never trust narocnik_id from request body
    const insertData = {
      narocnik_id: user.id,
      title,
      location_city: locationCity,
      description: description || null,
      stranka_ime: stranka_ime || null,
      stranka_email: stranka_email || null,
      stranka_telefon: stranka_telefon || null,
      obrtnik_id: obrtnik_id || null,
      termin_datum: termin_datum || null,
      termin_ura: termin_ura || null,
      category_id: finalCategoryId || null,
      urgency: urgency || 'normalno',
      budget_min: budget_min || null,
      budget_max: budget_max || null,
      location_notes: location_notes || null,
      preferred_date_from: preferred_date_from || null,
      preferred_date_to: preferred_date_to || null,
      attachment_urls: attachment_urls && attachment_urls.length > 0 ? attachment_urls : null,
      // CRITICAL FIX: Ensure status is 'odprto' so craftsmen can see it
      status: obrtnik_id ? 'dodeljeno' : 'odprto',
      created_at: new Date().toISOString()
    }

    let { data, error } = await supabaseAdmin
      .from('povprasevanja')
      .insert(insertData)
      .select()
      .single()

    // Backward compatibility: some production DBs may not yet have `attachment_urls`.
    // In that case retry insert without the column instead of failing with 500.
    if (error && error.code === 'PGRST204' && error.message?.includes('attachment_urls')) {
      console.warn('[v0] attachment_urls missing in schema, retrying insert without attachment_urls')
      const { attachment_urls: _attachmentUrls, ...insertDataWithoutAttachments } = insertData
      const retryResult = await supabaseAdmin
        .from('povprasevanja')
        .insert(insertDataWithoutAttachments)
        .select()
        .single()

      data = retryResult.data
      error = retryResult.error
    }

    if (error) {
      console.error('[v0] Supabase insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[v0] Povprasevanje created:', {
      id: data.id,
      narocnik_id: data.narocnik_id,
      status: data.status,
      title: data.title
    })

    // Send async notifications (fire and forget)
    try {
      // Send push notifications to craftsmen in this category
      if (finalCategoryId && title && locationCity) {
        sendPushToObrtnikiByCategory({
          categoryId: finalCategoryId,
          title: 'Novo povpraševanje v vaši kategoriji',
          message: `${title} — ${locationCity}`,
          link: '/obrtnik/povprasevanja'
        }).catch(err => console.error('[v0] Error sending push:', err))
      }

      // Enqueue confirmation email
      enqueue('sendEmail', {
        jobType: 'povprasevanje_confirmation',
        povprasevanjeId: data.id,
        narocnikId: data.narocnik_id,
        title: data.title,
        category: finalCategoryId ? categoryName : null,
        location: data.location_city,
        urgency: data.urgency,
        budget: data.budget_max,
      }).catch(err => console.error('[v0] Error enqueueing email:', err))
    } catch (notifyErr) {
      // Log but don't fail the response
      console.error('[v0] Error with notifications:', notifyErr)
    }

    return NextResponse.json({ id: data.id, status: data.status }, { status: 201 })
  } catch (err) {
    console.error('[v0] Unhandled error in povprasevanje endpoint:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('povprasevanja')
      .select(`
        *, 
        narocnik:profiles!povprasevanja_narocnik_id_fkey(id, ime, priimek, email),
        obrtniki (id, ime, priimek, email, telefon, ocena)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,stranka_ime.ilike.%${search}%,location_city.ilike.%${search}%`
      )
    }

    const { data, count, error } = await query
    if (error) {
      console.error('[v0] GET povprasevanja error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, count, page, limit })
  } catch (err) {
    console.error('[v0] Unhandled error in GET povprasevanje:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
