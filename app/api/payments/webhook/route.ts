import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

/**
 * DEPRECATED: This webhook handler is superseded by /api/webhooks/stripe.
 * All Stripe events are now handled through the primary webhook.
 * Kept for backward compatibility - returns 410 and points callers to the canonical endpoint.
 */
export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature')

  const logContext = {
    endpoint: '/api/payments/webhook',
    canonicalEndpoint: '/api/webhooks/stripe',
    hasSignature: Boolean(sig),
  }

  if (!sig) {
    console.warn('[PAYMENT_WEBHOOK_DEPRECATED] Missing signature header', logContext)
    return NextResponse.json(
      {
        error: 'Deprecated webhook endpoint',
        message: 'Use /api/webhooks/stripe with Stripe signature verification.',
        canonicalEndpoint: '/api/webhooks/stripe',
      },
      { status: 410 }
    )
  }

  console.warn('[PAYMENT_WEBHOOK_DEPRECATED] Deprecated endpoint called', logContext)
  return NextResponse.json(
    {
      error: 'Deprecated webhook endpoint',
      message: 'This endpoint no longer processes Stripe events. Switch to /api/webhooks/stripe.',
      canonicalEndpoint: '/api/webhooks/stripe',
    },
    { status: 410 }
  )
}
