/**
 * Accept Offer Tool
 * Customer accepts a partner's quote
 */

import { createClient } from '@/lib/supabase/server'
import type { AgentContext } from '../context'

export async function acceptOffer(
  params: Record<string, unknown>,
  context: AgentContext
): Promise<{ escrowId: string; status: string }> {
  const { offerId } = params as any

  if (!offerId) {
    throw {
      success: false,
      error: 'Missing required field: offerId',
      code: 400,
    }
  }

  try {
    const supabase = await createClient()

    // Get offer with inquiry details
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select(`
        id,
        status,
        price_cents,
        povprasevanje_id,
        povprasevanja!offers_povprasevanje_id_fkey(narocnik_id)
      `)
      .eq('id', offerId)
      .single()

    if (offerError || !offer) {
      throw {
        success: false,
        error: 'Offer not found',
        code: 404,
      }
    }

    // Verify user is the customer
    if (offer.povprasevanja.narocnik_id !== context.userId) {
      throw {
        success: false,
        error: 'Forbidden: you are not the inquiry creator',
        code: 403,
      }
    }

    if (offer.status !== 'pending') {
      throw {
        success: false,
        error: `Cannot accept ${offer.status} offer`,
        code: 409,
      }
    }

    // Update offer to accepted
    const { error: updateError } = await supabase
      .from('offers')
      .update({ status: 'accepted' })
      .eq('id', offerId)

    if (updateError) {
      throw {
        success: false,
        error: 'Failed to accept offer',
        code: 500,
      }
    }

    // Create escrow for payment
    const { data: escrow, error: escrowError } = await supabase
      .from('escrow_transactions')
      .insert({
        customer_id: context.userId,
        offer_id: offerId,
        amount_cents: offer.price_cents,
        status: 'pending',
      })
      .select('id')
      .single()

    if (escrowError || !escrow) {
      throw {
        success: false,
        error: 'Failed to create escrow',
        code: 500,
      }
    }

    return {
      escrowId: escrow.id,
      status: 'pending',
    }
  } catch (error: any) {
    throw {
      success: false,
      error: error?.error || error?.message || 'Failed to accept offer',
      code: error?.code || 500,
    }
  }
}
