import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paymentService, handleServiceError } from '@/lib/services'
import { withRateLimit } from '@/lib/rate-limit/with-rate-limit'
import { paymentLimiter } from '@/lib/rate-limit/limiters'
import { ok, fail } from '@/lib/http/response'

async function postHandler(request: NextRequest) {
  try {
    const { ponudbaId } = await request.json()

    if (!ponudbaId) {
      return fail('ponudbaId is required', 400)
    }

    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return fail('Unauthorized - not logged in', 401)
    }

    // Delegate to service layer
    const result = await paymentService.createPaymentIntent(
      user.id,
      ponudbaId,
      user.email || ''
    )

    return ok({
      clientSecret: result.clientSecret,
      amount: result.amount,
      currency: result.currency,
    })
  } catch (error) {
    console.error('[api/payments/create-intent] error:', error)
    return handleServiceError(error)
  }
}

export const POST = withRateLimit(paymentLimiter, postHandler)


