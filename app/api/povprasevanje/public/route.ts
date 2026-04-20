import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'
import { slugify } from '@/lib/utils/slugify'
import { publicInquirySchema } from '@/lib/validators/public-inquiry'
import { geocodeLocation } from '@/lib/google/geocoding'

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
      return NextResponse.json(
        { error: 'Neveljavno JSON telo zahtevka' },
        { status: 400 }
      )
    }

    const parsedInput = publicInquirySchema.safeParse({
      storitev: toOptionalString(body.storitev),
      lokacija: toOptionalString(body.lokacija),
      opis: toOptionalString(body.opis) || '',
      stranka_email: toOptionalString(body.stranka_email) ?? toOptionalString(body.email) ?? undefined,
      stranka_telefon: toOptionalString(body.stranka_telefon) ?? toOptionalString(body.telefon) ?? undefined,
      stranka_ime: toOptionalString(body.stranka_ime) ?? toOptionalString(body.ime) ?? undefined,
    })

    if (!parsedInput.success) {
      return NextResponse.json(
        { error: parsedInput.error.issues[0]?.message || 'Neveljavni vhodni podatki' },
        { status: 400 }
      )
    }

    const { storitev, lokacija, opis, stranka_email, stranka_telefon, stranka_ime } = parsedInput.data

    if (!storitev || !lokacija) {
      return NextResponse.json({ error: 'Manjkajo obvezna polja' }, { status: 400 })
    }

    const isDuplicate = await hasRecentDuplicateInquiry({
      storitev,
      lokacija,
      stranka_email,
      stranka_telefon,
    })

    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Podobno povpraševanje je bilo pravkar oddano. Prosimo počakajte trenutek.' },
        { status: 409 }
      )
    }

    const category_id = await resolveCategoryIdFromService(storitev)
    const normalizedLocation = await resolveLocationName(lokacija)

    // Primary schema (current app usage)
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
      console.warn('[public] Retrying insert with legacy schema payload', {
        requestId,
        code: error?.code,
        message: error?.message,
      })

      // Legacy schema compatibility (as defined in supabase/schema.sql)
      const legacyInsertData: Record<string, string> = {
        storitev,
        lokacija,
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
      return NextResponse.json({ error: 'Napaka pri shranjevanju' }, { status: 500 })
    }

    if (stranka_email && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'LiftGO <info@liftgo.net>',
          to: stranka_email,
          subject: `✅ Povpraševanje oddano: ${storitev}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#0d9488;">Vaše povpraševanje je bilo uspešno oddano!</h2>
              <p>Pozdravljeni${stranka_ime ? ' ' + stranka_ime : ''},</p>
              <p>Prejeli smo vaše povpraševanje za <strong>${storitev}</strong> v kraju <strong>${lokacija}</strong>.</p>
              <p style="background:#f0fdf4;border-left:4px solid #0d9488;padding:12px;border-radius:4px;">
                ⏱️ Preverjen mojster vas bo kontaktiral v <strong>manj kot 2 urah</strong>.
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
              <p style="color:#94a3b8;font-size:12px;">LiftGO — <a href="https://liftgo.net" style="color:#0d9488;">liftgo.net</a></p>
            </div>
          `,
        })
      } catch (emailError) {
        console.error('[public] Email error:', { requestId, error: emailError })
      }
    }

    if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'LiftGO <info@liftgo.net>',
          to: process.env.ADMIN_EMAIL,
          subject: `🔔 Novo povpraševanje: ${storitev}`,
          html: `
            <h3>Novo povpraševanje prejeto</h3>
            <p><strong>Storitev:</strong> ${storitev}</p>
            <p><strong>Lokacija:</strong> ${lokacija}</p>
            <p><strong>Email:</strong> ${stranka_email || 'N/A'}</p>
            <p><strong>Telefon:</strong> ${stranka_telefon || 'N/A'}</p>
            <a href="https://liftgo.net/admin/povprasevanja">Poglej v admin →</a>
          `,
        })
      } catch (emailError) {
        console.error('[public] Admin notify error:', { requestId, error: emailError })
      }
    }

    if (!data) {
      console.error('[public] Insert succeeded without row data', { requestId })
      return NextResponse.json({ error: 'Napaka pri shranjevanju' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (err) {
    console.error('[public] Unexpected error:', { requestId, error: err })
    return NextResponse.json({ error: 'Napaka strežnika' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
