import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

/**
 * DEPRECATED: This webhook handler is superseded by /api/stripe/webhook.
 * All Stripe events are now handled through the primary webhook.
 * Kept for backward compatibility - returns 200 to acknowledge receipt.
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    console.warn('[webhook-deprecated] Missing signature header')
    return NextResponse.json({ received: true, deprecated: true })
  }

  console.warn('[webhook-deprecated] /api/payments/webhook called. Use /api/stripe/webhook instead.')
  return NextResponse.json({ received: true, deprecated: true })
}
