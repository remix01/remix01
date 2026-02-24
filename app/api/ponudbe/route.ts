import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPonudba } from '@/lib/dal/ponudbe'
import { checkRateLimit } from '@/lib/rateLimit'
import { validateAmount, validateEnum, validateRequiredString, collectErrors } from '@/lib/validation'
import { apiSuccess, badRequest, unauthorized, forbidden, tooManyRequests, internalError } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return unauthorized()
    }

    // Rate limit check
    const { allowed, retryAfter } = checkRateLimit(
      `ponudbe:${user.id}`,
      10,      // max 10 ponudb
      60_000   // per minute
    )
    if (!allowed) {
      return tooManyRequests(`Too many requests. Try again in ${retryAfter}s.`)
    }

    // Parse request body
    const { povprasevanje_id, obrtnik_id, message, price_estimate, price_type, available_date } = await request.json()

    // INPUT VALIDATION - all checks before any DB calls
    const validationErrors = collectErrors(
      validateRequiredString(povprasevanje_id, 'povprasevanje_id'),
      validateRequiredString(obrtnik_id, 'obrtnik_id'),
      validateRequiredString(message, 'message'),
      validateAmount(price_estimate, 'price_estimate', 0),
      price_type ? validateEnum(price_type, 'price_type', ['fixed', 'hourly', 'estimate']) : null
    )

    if (validationErrors.length > 0) {
      return badRequest(validationErrors.map(e => `${e.field}: ${e.message}`).join('; '))
    }

    // Validate date if provided
    if (available_date) {
      const date = new Date(available_date)
      if (isNaN(date.getTime())) {
        return badRequest('available_date: Invalid date format')
      }
    }

    // Verify obrtnik owns this profile
    const { data: obrtnikProfile } = await supabase
      .from('obrtnik_profiles')
      .select('id')
      .eq('id', obrtnik_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!obrtnikProfile) {
      return forbidden('You do not own this obrtnik profile')
    }

    // Create ponudba
    const ponudba = await createPonudba({
      povprasevanje_id,
      obrtnik_id,
      message,
      price_estimate,
      price_type,
      available_date,
      status: 'poslana'
    })

    if (!ponudba) {
      return NextResponse.json(
        { success: false, error: 'Failed to create ponudba' },
        { status: 500 }
      )
    }

    return apiSuccess(ponudba)
  } catch (error) {
    console.error('[v0] Error creating ponudba:', error)
    return internalError()
  }
}
