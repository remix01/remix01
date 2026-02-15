import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { offerId, paymentIntentId } = await req.json()

    if (!offerId || !paymentIntentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

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
      return NextResponse.json(
        { error: 'Failed to update offer status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[v0] Update status error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update status' },
      { status: 500 }
    )
  }
}
