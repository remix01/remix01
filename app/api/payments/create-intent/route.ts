import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paymentService, handleServiceError } from '@/lib/services'

export async function POST(request: NextRequest) {
  try {
    const { ponudbaId } = await request.json()

    if (!ponudbaId) {
      return NextResponse.json(
        { error: 'ponudbaId is required' },
        { status: 400 }
      )
    }

    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - not logged in' },
        { status: 401 }
      )
    }

    // Delegate to service layer
    const result = await paymentService.createPaymentIntent(
      user.id,
      ponudbaId,
      user.email || ''
    )

    return NextResponse.json({
      clientSecret: result.clientSecret,
      amount: result.amount,
      currency: result.currency,
    })
  } catch (error) {
    console.error('[api/payments/create-intent] error:', error)
    return handleServiceError(error)
  }
}


