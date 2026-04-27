import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { slugify } from '@/lib/utils/slugify'
import { publicInquirySchema } from '@/lib/validators/public-inquiry'
import { geocodeLocation } from '@/lib/google/geocoding'
import { getDefaultFrom, getResendClient, resolveEmailRecipients } from '@/lib/resend'
import {
  checkEmailRateLimit,
  escapeHtml,
  isDisposableEmail,
  isHoneypotTriggered,
  sanitizeText,
} from '@/lib/email/security'
import { writeEmailLog } from '@/lib/email/email-logs'

type PublicInquiryBody = {
  storitev?: unknown
  lokacija?: unknown
  opis?: unknown
  email?: unknown
  telefon?: unknown
  ime?: unknown
  stranka_email?: unknown
  stranka_telefon?: unknown
  stranka_ime?: unknown
  website?: unknown
  company_url?: unknown
  user_id?: unknown
}

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

function errorResponse(message: string, status: number, code: string) {
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

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

async function parseJsonBody(request: NextRequest): Promise<PublicInquiryBody | null> {
  try {
    const rawBody = await request.text()
    if (!rawBody?.trim()) return null
    return JSON.parse(rawBody)
  } catch (error) {
    if (error instanceof SyntaxError) return null
    throw error
  }
}

async function resolveCategoryIdFromService(serviceName: string): Promise<string | null> {
  const trimmedService = serviceName.trim()
  if (!trimmedService) return null

  const { data: existingCategory, error: existingCategoryError } = await supabaseAdmin
    .from('categories')
    .select('id')
    .ilike('name', trimmedService)
    .eq('is_active', true)
    .maybeSingle()

  if (existingCategoryError && existingCategoryError.code !== 'PGRST116') {
    console.error('[public] Failed to check existing category:', existingCategoryError)
    return null
  }

  if (existingCategory) return existingCategory.id

  const baseSlug = slugify(trimmedService)
  let slug = baseSlug
  let counter = 1

  while (true) {
    const { data: slugMatch, error: slugMatchError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (slugMatchError && slugMatchError.code !== 'PGRST116') {
      console.error('[public] Failed to validate category slug:', slugMatchError)
      return null
    }

    if (!slugMatch) break
    slug = `${baseSlug}-${counter}`
    counter++
  }

  const { data: createdCategory, error: createdCategoryError } = await supabaseAdmin
    .from('categories')
    .insert({
      name: trimmedService,
      slug,
      is_active: true,
      is_auto_created: true,
      sort_order: 999,
    })
    .select('id')
    .single()

  if (createdCategoryError) {
    console.error('[public] Failed to create category:', createdCategoryError)
    return null
  }

  return createdCategory.id
}

async function resolveLocationName(locationName: string): Promise<string> {
  const geocoded = await geocodeLocation(locationName)
  const trimmedLocation = (geocoded?.city || locationName).trim()
  if (!trimmedLocation) return locationName

  const { data: existingLocation, error: existingLocationError } = await supabaseAdmin
    .from('locations')
    .select('name')
    .ilike('name', trimmedLocation)
    .eq('is_active', true)
    .maybeSingle()

  if (!existingLocationError && existingLocation?.name) {
    return existingLocation.name
  }

  if (existingLocationError && (existingLocationError.code === '42P01' || existingLocationError.code === 'PGRST205')) {
    return trimmedLocation
  }

  const baseSlug = slugify(trimmedLocation)
  let slug = baseSlug
  let counter = 1

  while (true) {
    const { data: slugMatch, error: slugMatchError } = await supabaseAdmin
      .from('locations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (slugMatchError && (slugMatchError.code === '42P01' || slugMatchError.code === 'PGRST205')) {
      return trimmedLocation
    }

    if (!slugMatch) break
    slug = `${baseSlug}-${counter}`
    counter++
  }

  const { data: createdLocation, error: createdLocationError } = await supabaseAdmin
    .from('locations')
    .insert({
      name: trimmedLocation,
      slug,
      is_active: true,
      is_auto_created: true,
    })
    .select('name')
    .single()

  if (!createdLocationError && createdLocation?.name) {
    return createdLocation.name
  }

  return trimmedLocation
}

async function hasRecentDuplicateInquiry(input: {
  storitev: string
  lokacija: string
  stranka_email?: string
  stranka_telefon?: string
}): Promise<boolean> {
  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString()

  if (!input.stranka_email && !input.stranka_telefon) return false

  try {
    if (input.stranka_email) {
      const { data, error } = await supabaseAdmin
        .from('povprasevanja')
        .select('id')
        .eq('title', input.storitev)
        .eq('location_city', input.lokacija)
        .eq('stranka_email', input.stranka_email)
        .gte('created_at', since)
        .limit(1)

      if (!error && data && data.length > 0) return true
    }

    if (input.stranka_telefon) {
      const { data, error } = await supabaseAdmin
        .from('povprasevanja')
        .select('id')
        .eq('title', input.storitev)
        .eq('location_city', input.lokacija)
        .eq('stranka_telefon', input.stranka_telefon)
        .gte('created_at', since)
        .limit(1)

      if (!error && data && data.length > 0) return true
    }
  } catch (error) {
    console.warn('[public] Duplicate check skipped due to query error', error)
  }

  return false
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-vercel-id') || crypto.randomUUID()

  try {
    const body = await parseJsonBody(request)
    if (!body) {
      return errorResponse('Neveljavno JSON telo zahtevka', 400, 'INVALID_JSON')
    }

    const honeypot = toOptionalString(body.website) ?? toOptionalString(body.company_url)
    const userId = toOptionalString(body.user_id)
    const incomingEmail = toOptionalString(body.stranka_email) ?? toOptionalString(body.email)

    if (isHoneypotTriggered(honeypot)) {
      await writeEmailLog({
        email: incomingEmail || 'unknown@unknown.local',
        type: 'inquiry_public',
        status: 'honeypot',
        userId,
        metadata: { requestId, endpoint: '/api/povprasevanje/public' },
      })

      return successResponse({ success: true, id: null })
    }

    if (incomingEmail && isDisposableEmail(incomingEmail)) {
      await writeEmailLog({
        email: incomingEmail,
        type: 'inquiry_public',
        status: 'blocked',
        userId,
        errorMessage: 'Disposable email domain blocked',
        metadata: { requestId, endpoint: '/api/povprasevanje/public' },
      })

      return errorResponse('Za oddajo povpraševanja uporabite trajni e-poštni naslov.', 400, 'DISPOSABLE_EMAIL_BLOCKED')
    }

    const rl = await checkEmailRateLimit({
      request,
      action: 'contact_inquiry',
      email: incomingEmail,
      userId,
    })

    if (!rl.allowed) {
      await writeEmailLog({
        email: incomingEmail || 'unknown@unknown.local',
        type: 'inquiry_public',
        status: 'rate_limited',
        userId,
        errorMessage: `Rate limited by ${rl.reason}`,
        metadata: { requestId, endpoint: '/api/povprasevanje/public', retryAfter: rl.retryAfter },
      })
      return rl.response
    }

    const parsedInput = publicInquirySchema.safeParse({
      storitev: toOptionalString(body.storitev),
      lokacija: toOptionalString(body.lokacija),
      opis: toOptionalString(body.opis) || '',
      stranka_email: incomingEmail ?? undefined,
      stranka_telefon: toOptionalString(body.stranka_telefon) ?? toOptionalString(body.telefon) ?? undefined,
      stranka_ime: toOptionalString(body.stranka_ime) ?? toOptionalString(body.ime) ?? undefined,
    })

    if (!parsedInput.success) {
      return errorResponse(parsedInput.error.issues[0]?.message || 'Neveljavni vhodni podatki', 400, 'INVALID_INPUT')
    }

    const { storitev, lokacija, opis, stranka_email, stranka_telefon, stranka_ime } = parsedInput.data

    if (!storitev || !lokacija) {
      return errorResponse('Manjkajo obvezna polja', 400, 'MISSING_REQUIRED_FIELDS')
    }

    const normalizedLocation = await resolveLocationName(lokacija)

    const isDuplicate = await hasRecentDuplicateInquiry({
      storitev,
      lokacija: normalizedLocation,
      stranka_email,
      stranka_telefon,
    })

    if (isDuplicate) {
      return errorResponse('Podobno povpraševanje je bilo pravkar oddano. Prosimo počakajte trenutek.', 409, 'DUPLICATE_INQUIRY')
    }

    const category_id = await resolveCategoryIdFromService(storitev)

    const modernInsertData: Record<string, string | null> = {
      title: storitev,
      description: opis,
      location_city: normalizedLocation,
      status: 'odprto',
      narocnik_id: null,
      category_id,
    }

    if (stranka_email) modernInsertData.stranka_email = stranka_email
    if (stranka_telefon) modernInsertData.stranka_telefon = stranka_telefon
    if (stranka_ime) modernInsertData.stranka_ime = stranka_ime

    let { data, error } = await supabaseAdmin
      .from('povprasevanja')
      .insert(modernInsertData)
      .select('id')
      .single()

    const shouldRetryWithLegacySchema =
      !!error &&
      ((error.code === 'PGRST204' &&
        (error.message?.includes('title') ||
          error.message?.includes('description') ||
          error.message?.includes('location_city') ||
          error.message?.includes('narocnik_id') ||
          error.message?.includes('category_id'))) ||
        error.code === '23514')

    if (shouldRetryWithLegacySchema) {
      console.warn('[public][TODO:remove-after-schema-convergence] Retrying insert with legacy schema payload', {
        requestId,
        code: error?.code,
        message: error?.message,
      })

      const legacyInsertData: Record<string, string> = {
        storitev,
        lokacija: normalizedLocation,
        opis: opis || '',
        status: 'novo',
        stranka_ime: stranka_ime || 'Neznana stranka',
      }

      if (stranka_email) legacyInsertData.stranka_email = stranka_email
      if (stranka_telefon) legacyInsertData.stranka_telefon = stranka_telefon

      const retryResult = await supabaseAdmin
        .from('povprasevanja')
        .insert(legacyInsertData)
        .select('id')
        .single()

      data = retryResult.data
      error = retryResult.error
    }

    if (error) {
      console.error('[public] DB error:', {
        requestId,
        code: error.code,
        message: error.message,
        details: error.details,
      })
      return errorResponse('Napaka pri shranjevanju', 500, 'DB_INSERT_FAILED')
    }

    const resend = getResendClient()
    const safeService = escapeHtml(sanitizeText(storitev, 120))
    const safeLocation = escapeHtml(sanitizeText(lokacija, 120))
    const safeName = stranka_ime ? escapeHtml(sanitizeText(stranka_ime, 120)) : ''

    if (stranka_email && resend) {
      await writeEmailLog({
        email: stranka_email,
        type: 'inquiry_customer_confirmation',
        status: 'pending',
        userId,
        metadata: { requestId, inquiryId: data?.id },
      })

      try {
        const customerResponse = await resend.emails.send({
          from: getDefaultFrom(),
          to: resolveEmailRecipients(stranka_email).to,
          subject: `✅ Povpraševanje oddano: ${safeService}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#0d9488;">Vaše povpraševanje je bilo uspešno oddano!</h2>
              <p>Pozdravljeni${safeName ? ` ${safeName}` : ''},</p>
              <p>Prejeli smo vaše povpraševanje za <strong>${safeService}</strong> v kraju <strong>${safeLocation}</strong>.</p>
              <p style="background:#f0fdf4;border-left:4px solid #0d9488;padding:12px;border-radius:4px;">
                ⏱️ Preverjen mojster vas bo kontaktiral v <strong>manj kot 2 urah</strong>.
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
              <p style="color:#94a3b8;font-size:12px;">LiftGO — <a href="https://liftgo.net" style="color:#0d9488;">liftgo.net</a></p>
            </div>
          `,
        })

        if (customerResponse.error) {
          await writeEmailLog({
            email: stranka_email,
            type: 'inquiry_customer_confirmation',
            status: 'failed',
            userId,
            errorMessage: customerResponse.error.message,
            metadata: { requestId, inquiryId: data?.id },
          })
        } else {
          await writeEmailLog({
            email: stranka_email,
            type: 'inquiry_customer_confirmation',
            status: 'sent',
            userId,
            resendEmailId: customerResponse.data?.id,
            metadata: { requestId, inquiryId: data?.id },
          })
        }
      } catch (emailError) {
        await writeEmailLog({
          email: stranka_email,
          type: 'inquiry_customer_confirmation',
          status: 'failed',
          userId,
          errorMessage: emailError instanceof Error ? emailError.message : 'Unknown email error',
          metadata: { requestId, inquiryId: data?.id },
        })
        console.error('[public] Email error:', { requestId, error: emailError })
      }
    }

    if (resend && process.env.ADMIN_EMAIL) {
      await writeEmailLog({
        email: process.env.ADMIN_EMAIL,
        type: 'inquiry_admin_notification',
        status: 'pending',
        userId,
        metadata: { requestId, inquiryId: data?.id },
      })

      try {
        const adminResponse = await resend.emails.send({
          from: getDefaultFrom(),
          to: resolveEmailRecipients(process.env.ADMIN_EMAIL).to,
          subject: `🔔 Novo povpraševanje: ${safeService}`,
          html: `
            <h3>Novo povpraševanje prejeto</h3>
            <p><strong>Storitev:</strong> ${safeService}</p>
            <p><strong>Lokacija:</strong> ${safeLocation}</p>
            <p><strong>Email:</strong> ${stranka_email ? escapeHtml(stranka_email) : 'N/A'}</p>
            <p><strong>Telefon:</strong> ${stranka_telefon ? escapeHtml(stranka_telefon) : 'N/A'}</p>
            <a href="https://liftgo.net/admin/povprasevanja">Poglej v admin →</a>
          `,
        })

        if (adminResponse.error) {
          await writeEmailLog({
            email: process.env.ADMIN_EMAIL,
            type: 'inquiry_admin_notification',
            status: 'failed',
            userId,
            errorMessage: adminResponse.error.message,
            metadata: { requestId, inquiryId: data?.id },
          })
        } else {
          await writeEmailLog({
            email: process.env.ADMIN_EMAIL,
            type: 'inquiry_admin_notification',
            status: 'sent',
            userId,
            resendEmailId: adminResponse.data?.id,
            metadata: { requestId, inquiryId: data?.id },
          })
        }
      } catch (emailError) {
        await writeEmailLog({
          email: process.env.ADMIN_EMAIL,
          type: 'inquiry_admin_notification',
          status: 'failed',
          userId,
          errorMessage: emailError instanceof Error ? emailError.message : 'Unknown email error',
          metadata: { requestId, inquiryId: data?.id },
        })
        console.error('[public] Admin notify error:', { requestId, error: emailError })
      }
    }

    if (!data) {
      console.error('[public] Insert succeeded without row data', { requestId })
      return errorResponse('Napaka pri shranjevanju', 500, 'MISSING_INSERT_ROW')
    }

    return successResponse({ success: true, id: data.id })
  } catch (err) {
    console.error('[public] Unexpected error:', { requestId, error: err })
    return errorResponse('Napaka strežnika', 500, 'INTERNAL_SERVER_ERROR')
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
