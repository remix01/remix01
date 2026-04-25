import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getOrCreateCategory } from '@/lib/dal/categories'
import { getOrCreateLocation } from '@/lib/dal/locations'
import { geocodeLocation } from '@/lib/google/geocoding'
import { sendPushToObrtnikiByCategory } from '@/lib/push-notifications'
import { enqueue } from '@/lib/jobs/queue'
import { withRateLimit } from '@/lib/rate-limit/with-rate-limit'
import { inquiryLimiter } from '@/lib/rate-limit/limiters'
import { z } from 'zod'
import {
  checkEmailRateLimit,
  isDisposableEmail,
  isHoneypotTriggered,
  sanitizeText,
} from '@/lib/email/security'
import { writeEmailLog } from '@/lib/email/email-logs'

const authenticatedInquirySchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  storitev: z.string().trim().min(2).max(120).optional(),
  location_city: z.string().trim().min(2).max(120).optional(),
  lokacija: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  opis: z.string().trim().max(2000).optional(),
  stranka_ime: z.string().trim().max(120).optional(),
  stranka_email: z.string().trim().email().optional(),
  stranka_telefon: z.string().trim().max(32).optional(),
  website: z.string().trim().max(300).optional(),
  company_url: z.string().trim().max(300).optional(),
}).passthrough()

async function postHandler(req: NextRequest) {
  try {
    // ── SECURITY: Verify user is authenticated ─────────────────────────────
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsedBody = authenticatedInquirySchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message || 'Invalid request body' },
        { status: 400 }
      )
    }

    const safeBody = parsedBody.data
    const honeypot = safeBody.website ?? safeBody.company_url
    const candidateEmail = safeBody.stranka_email?.trim()

    if (isHoneypotTriggered(honeypot)) {
      await writeEmailLog({
        email: candidateEmail || user.email || 'unknown@unknown.local',
        type: 'inquiry_authenticated',
        status: 'honeypot',
        userId: user.id,
        metadata: { endpoint: '/api/povprasevanje' },
      })
      return NextResponse.json({ success: true, id: null, status: 'ignored' }, { status: 200 })
    }

    if (candidateEmail && isDisposableEmail(candidateEmail)) {
      await writeEmailLog({
        email: candidateEmail,
        type: 'inquiry_authenticated',
        status: 'blocked',
        userId: user.id,
        errorMessage: 'Disposable email domain blocked',
        metadata: { endpoint: '/api/povprasevanje' },
      })
      return NextResponse.json(
        { error: 'Za oddajo povpraševanja uporabite trajni e-poštni naslov.' },
        { status: 400 }
      )
    }

    const securityRateLimit = await checkEmailRateLimit({
      request: req,
      action: 'contact_inquiry',
      email: candidateEmail ?? null,
      userId: user.id,
    })

    if (!securityRateLimit.allowed) {
      await writeEmailLog({
        email: candidateEmail || user.email || 'unknown@unknown.local',
        type: 'inquiry_authenticated',
        status: 'rate_limited',
        userId: user.id,
        errorMessage: `Rate limited by ${securityRateLimit.reason}`,
        metadata: { endpoint: '/api/povprasevanje', retryAfter: securityRateLimit.retryAfter },
      })
      return securityRateLimit.response
    }

    // Map legacy field names to database column names
    // Support both old (storitev, lokacija, opis) and new (title, location_city, description) field names
    const titleRaw = safeBody.title || safeBody.storitev
    const locationRaw = safeBody.location_city || safeBody.lokacija
    const descriptionRaw = safeBody.description || safeBody.opis
    const title = typeof titleRaw === 'string' ? sanitizeText(titleRaw, 120) : titleRaw
    const locationCity = typeof locationRaw === 'string' ? sanitizeText(locationRaw, 120) : locationRaw
    const description = typeof descriptionRaw === 'string' ? sanitizeText(descriptionRaw, 2000) : descriptionRaw

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
    } = safeBody
    const normalizedCategoryName = typeof categoryName === 'string' ? categoryName : null
    const normalizedAttachmentUrls = Array.isArray(attachment_urls)
      ? attachment_urls.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : null

    // Validate required fields
    if (!title || !locationCity) {
      return NextResponse.json(
        { error: 'Title and location are required' },
        { status: 400 }
      )
    }

    // Handle category auto-creation if categoryName provided
    let finalCategoryId: string | null = typeof category_id === 'string' ? category_id : null
    const requestedCategoryName =
      (typeof categoryName === 'string' && categoryName.trim().length > 0
        ? categoryName
        : typeof title === 'string'
          ? title
          : null)

    if (requestedCategoryName && !finalCategoryId) {
      try {
        finalCategoryId = await getOrCreateCategory(requestedCategoryName, user.id)
      } catch (catError) {
        console.error('[v0] Error creating category:', catError)
        console.warn('[monitor] CATEGORY_AUTO_CREATE_FAILED', {
          userId: user.id,
          categoryName: requestedCategoryName,
          endpoint: 'POST /api/povprasevanje',
          timestamp: new Date().toISOString(),
        })
        return NextResponse.json(
          {
            error:
              catError instanceof Error
                ? catError.message
                : 'Ustvarjanje kategorije ni uspelo. Prosimo poskusite ponovno.',
          },
          { status: 400 }
        )
      }
    }

    // Normalize with Google Geocoding (when configured) and auto-register city in locations lookup table.
    const geocoded = await geocodeLocation(String(locationCity))
    let finalLocationCity = geocoded?.city || locationCity
    try {
      finalLocationCity = await getOrCreateLocation(String(finalLocationCity))
    } catch (locationError) {
      console.warn('[monitor] LOCATION_AUTO_CREATE_FAILED', {
        userId: user.id,
        locationCity: finalLocationCity,
        endpoint: 'POST /api/povprasevanje',
        error: locationError instanceof Error ? locationError.message : String(locationError),
      })
    }

    // CRITICAL FIX: Always set narocnik_id from authenticated user
    // Never trust narocnik_id from request body
    const insertData = {
      narocnik_id: user.id,
      title,
      location_city: finalLocationCity,
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
      attachment_urls: normalizedAttachmentUrls,
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
      if (finalCategoryId && title && finalLocationCity) {
        sendPushToObrtnikiByCategory({
          categoryId: finalCategoryId,
          title: 'Novo povpraševanje v vaši kategoriji',
          message: `${title} — ${finalLocationCity}`,
          link: '/obrtnik/povprasevanja'
        }).catch(err => console.error('[v0] Error sending push:', err))
      }

      // Enqueue confirmation email
      enqueue('sendEmail', {
        jobType: 'povprasevanje_confirmation',
        povprasevanjeId: data.id,
        narocnikId: data.narocnik_id,
        title: data.title,
        category: finalCategoryId ? normalizedCategoryName : null,
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

export const POST = withRateLimit(inquiryLimiter, postHandler)

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
