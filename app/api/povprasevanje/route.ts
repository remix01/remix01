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

function successResponse<T extends Record<string, unknown>>(legacy: T, status = 200) {
  return NextResponse.json(
    {
      ok: true,
      data: legacy,
      ...legacy,
    },
    { status }
  )
}

function errorResponse(
  message: string,
  status: number,
  code: string
) {
  return NextResponse.json(
    {
      ok: false,
      data: null,
      error: message,
      error_details: { code, message },
    },
    { status }
  )
}

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
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED')
    }

    const body = await req.json()
    const parsedBody = authenticatedInquirySchema.safeParse(body)
    if (!parsedBody.success) {
      return errorResponse(parsedBody.error.issues[0]?.message || 'Invalid request body', 400, 'BAD_REQUEST')
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
        {
          ok: false,
          data: null,
          error: 'Za oddajo povpraševanja uporabite trajni e-poštni naslov.',
          error_details: {
            code: 'DISPOSABLE_EMAIL_BLOCKED',
            message: 'Za oddajo povpraševanja uporabite trajni e-poštni naslov.',
          },
        },
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
      return errorResponse('Title and location are required', 400, 'MISSING_REQUIRED_FIELDS')
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
            ok: false,
            data: null,
            error:
              catError instanceof Error
                ? catError.message
                : 'Ustvarjanje kategorije ni uspelo. Prosimo poskusite ponovno.',
            error_details: {
              code: 'CATEGORY_AUTO_CREATE_FAILED',
              message:
                catError instanceof Error
                  ? catError.message
                  : 'Ustvarjanje kategorije ni uspelo. Prosimo poskusite ponovno.',
            },
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
    const insertData: Record<string, any> = {
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

    let payload = { ...insertData }
    let data: any = null
    let error: any = null

    // Backward compatibility for production schemas that may not yet include
    // all optional columns (e.g. stranka_ime, attachment_urls, termin_*).
    // Retry by removing unknown columns reported by PostgREST.
    for (let i = 0; i < 6; i++) {
      const result = await supabaseAdmin
        .from('povprasevanja')
        .insert(payload)
        .select()
        .single()

      data = result.data
      error = result.error

      if (!error) break
      if (error.code !== 'PGRST204' || !error.message?.includes('Could not find the')) break

      const columnMatch = error.message.match(/'([^']+)' column/)
      const missingColumn = columnMatch?.[1]
      if (!missingColumn || !(missingColumn in payload)) break

      console.warn('[v0] Missing column in povprasevanja schema, retrying without column:', missingColumn)
      delete payload[missingColumn]
    }

    if (error) {
      console.error('[v0] Supabase insert error:', error)
      return errorResponse(error.message, 500, 'DB_INSERT_FAILED')
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

      // Notify matched craftsmen by email and schedule reminders (24h/48h)
      if (finalCategoryId) {
        const { data: matched } = await supabaseAdmin
          .from('obrtnik_profiles')
          .select('id, profile:profiles(email,ime,priimek)')
          .eq('category_id', finalCategoryId)
          .eq('is_active', true)

        const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://liftgo.net'
        for (const m of matched || []) {
          const email = (m as any)?.profile?.email
          if (!email) continue
          const payload = {
            to: email,
            template: 'marketplace_match_new_request',
            povprasevanjeId: data.id,
            customer_name: data.stranka_ime || 'Naročnik',
            category: normalizedCategoryName || data.title,
            location: data.location_city,
            description: data.description || '',
            budget: data.budget_max ? `€${data.budget_max}` : 'Po dogovoru',
            link: `${baseUrl}/obrtnik/povprasevanja/${data.id}`,
          }
          enqueue('sendEmail', payload).catch(err => console.error('[EMAIL] match notify enqueue failed', err))
          enqueue('sendEmail', { ...payload, customData: { reminder: '24h' } }, { delay: 24 * 60 * 60 }).catch(err => console.error('[EMAIL] 24h reminder enqueue failed', err))
          enqueue('sendEmail', { ...payload, customData: { reminder: '48h' } }, { delay: 48 * 60 * 60 }).catch(err => console.error('[EMAIL] 48h reminder enqueue failed', err))
        }
      }
    } catch (notifyErr) {
      // Log but don't fail the response
      console.error('[v0] Error with notifications:', notifyErr)
    }

    return successResponse({ id: data.id, status: data.status }, 201)
  } catch (err) {
    console.error('[v0] Unhandled error in povprasevanje endpoint:', err)
    return errorResponse('Internal server error', 500, 'INTERNAL_SERVER_ERROR')
  }
}

export const POST = withRateLimit(inquiryLimiter, postHandler)

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED')
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
      return errorResponse(error.message, 500, 'DB_QUERY_FAILED')
    }

    return successResponse({ data, count, page, limit })
  } catch (err) {
    console.error('[v0] Unhandled error in GET povprasevanje:', err)
    return errorResponse('Internal server error', 500, 'INTERNAL_SERVER_ERROR')
  }
}
