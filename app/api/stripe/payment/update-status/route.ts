import { getErrorMessage } from '@/lib/utils/error'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fail } from '@/lib/http/response'

export async function POST(req: NextRequest) {
  try {
    const { offerId, paymentIntentId } = await req.json()

    if (!offerId || !paymentIntentId) return fail('Missing required fields', 400)

    const supabase = await createClient()

    // Update offer status to 'paid'
    const { error } = await supabase
      .from('offers')
      .update({
        status: 'paid',
        payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', offerId)

    if (error) {
      console.error('[v0] Database update error:', error)
      return fail('Failed to update offer status', 500)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[v0] Update status error:', error)
    return fail(getErrorMessage(error) || 'Failed to update status', 500)
  }
}
