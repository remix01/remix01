/**
 * Submit Offer Tool
 * Partner submits a quote for a customer's inquiry
 */

import { createClient } from '@/lib/supabase/server'
import type { AgentContext } from '../context'

export async function submitOffer(
  params: Record<string, unknown>,
  context: AgentContext
): Promise<{ offerId: string; status: string }> {
  const { inquiryId, priceOffered, estimatedDays, notes } = params as any

  // Validate required params
  if (!inquiryId || priceOffered === undefined || estimatedDays === undefined) {
    throw {
      success: false,
      error: 'Missing required fields: inquiryId, priceOffered, estimatedDays',
      code: 400,
    }
  }

  try {
    const supabase = await createClient()

    // Verify inquiry exists and is open
    const { data: inquiry, error: inquiryError } = await supabase
      .from('povprasevanja')
      .select('id, status')
      .eq('id', inquiryId)
      .single()

    if (inquiryError || !inquiry) {
      throw {
        success: false,
        error: 'Inquiry not found',
        code: 404,
      }
    }

    if (inquiry.status !== 'open') {
      throw {
        success: false,
        error: `Cannot submit offer to ${inquiry.status} inquiry`,
        code: 409,
      }
    }

    // Get partner profile
    const { data: partnerProfile, error: partnerError } = await supabase
      .from('obrtnik_profiles')
      .select('id')
      .eq('user_id', context.userId)
      .single()

    if (partnerError || !partnerProfile) {
      throw {
        success: false,
        error: 'Partner profile not found',
        code: 404,
      }
    }

    // Create offer
    const { data: offer, error: createError } = await supabase
      .from('offers')
      .insert({
        povprasevanje_id: inquiryId,
        obrtnik_id: partnerProfile.id,
        price_cents: Math.round(priceOffered * 100),
        estimated_days: estimatedDays,
        notes: notes || null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (createError || !offer) {
      throw {
        success: false,
        error: 'Failed to create offer',
        code: 500,
      }
    }

    return {
      offerId: offer.id,
      status: 'pending',
    }
  } catch (error: any) {
    throw {
      success: false,
      error: error?.error || error?.message || 'Failed to submit offer',
      code: error?.code || 500,
    }
  }
}
