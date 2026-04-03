import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
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
      urgency,
      budget_min,
      budget_max,
      location_notes
    } = body

    // Validate required fields
    if (!title || !locationCity) {
      return NextResponse.json(
        { error: 'Title and location are required' },
        { status: 400 }
      )
    }

    // CRITICAL FIX: Always set narocnik_id from authenticated user
    // Never trust narocnik_id from request body
    const insertData = {
      narocnik_id: user.id,
      title,
      location_city: locationCity,
      description,
      stranka_ime: stranka_ime || null,
      stranka_email: stranka_email || null,
      stranka_telefon: stranka_telefon || null,
      obrtnik_id: obrtnik_id || null,
      termin_datum: termin_datum || null,
      termin_ura: termin_ura || null,
      category_id: category_id || null,
      urgency: urgency || 'normalno',
      budget_min: budget_min || null,
      budget_max: budget_max || null,
      location_notes: location_notes || null,
      // CRITICAL FIX: Ensure status is 'odprto' so craftsmen can see it
      status: obrtnik_id ? 'dodeljeno' : 'odprto',
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from('povprasevanja')
      .insert(insertData)
      .select()
      .single()

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
