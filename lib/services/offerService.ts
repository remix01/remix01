/**
 * Offer Service - Extracted from app/api/offers/route.ts
 * Handles offers (ponudbe) operations
 */

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createPonudba } from '@/lib/dal/ponudbe'
import { ServiceError } from './serviceError'
import type { PonudbaInsert } from '@/types/marketplace'

export const offerService = {
  /**
   * Get offers for authenticated user
   * Business logic extracted from GET /api/offers
   */
  async getOffers(userId: string, userRole: string | null, partnerId?: string) {
    const supabase = await createClient()
    let query = supabase.from('ponudbe').select('*').order('created_at', { ascending: false })

    if (userRole === 'admin') {
      if (partnerId) {
        query = query.eq('obrtnik_id', partnerId)
      }
    } else if (userRole === 'partner') {
      query = query.eq('obrtnik_id', userId)
    } else {
      // Regular users see offers for their requests
      const { data: userRequests } = await supabaseAdmin
        .from('povprasevanja')
        .select('id')
        .eq('narocnik_id', userId)

      const requestIds = userRequests?.map((r: any) => r.id) || []

      if (requestIds.length === 0) {
        return []
      }

      query = query.in('povprasevanje_id', requestIds)
    }

    const { data: offers, error } = await query

    if (error) {
      throw new ServiceError(
        error.message,
        'DB_ERROR',
        500
      )
    }

    return offers
  },

  /**
   * Create a new offer
   * Business logic extracted from POST /api/offers
   */
  async createOffer(
    userId: string,
    data: {
      partner_id: string
      request_id: string
      title: string
      description?: string
      price: number
      estimated_duration?: string
      notes?: string
    }
  ) {
    const supabase = await createClient()

    // Validate required fields
    if (!data.partner_id || !data.request_id || !data.title || !data.price) {
      throw new ServiceError(
        'Manjkajo zahtevani podatki',
        'VALIDATION',
        400
      )
    }

    // Verify user owns the povprasevanja
    const { data: inquiry } = await supabaseAdmin
      .from('povprasevanja')
      .select('narocnik_id')
      .eq('id', data.request_id)
      .maybeSingle()

    if (!inquiry || inquiry.narocnik_id !== userId) {
      throw new ServiceError(
        'Unauthorized - you do not own this request',
        'FORBIDDEN',
        403
      )
    }

    // Verify partner owns the provided partner_id
    const { data: partnerProfile } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id')
      .eq('id', data.partner_id)
      .eq('id', userId)
      .maybeSingle()

    if (!partnerProfile) {
      throw new ServiceError(
        'Unauthorized - invalid partner',
        'FORBIDDEN',
        403
      )
    }

    const { data: offer, error } = await supabase
      .from('ponudbe')
      .insert({
        obrtnik_id: data.partner_id,
        povprasevanje_id: data.request_id,
        message: `${data.title}\n\n${data.description || ''}\n${data.notes ? `\nOpombe: ${data.notes}` : ''}`.trim(),
        price_estimate: parseFloat(data.price.toString()),
        estimated_duration: data.estimated_duration,
        status: 'poslana',
        price_type: 'ocena',
      })
      .select()
      .maybeSingle()

    if (error) {
      throw new ServiceError(
        error.message,
        'DB_ERROR',
        500
      )
    }

    return offer
  },

  /**
   * Create ponudba (Slovenian offer)
   * Business logic extracted from POST /api/ponudbe
   */
  async createPonudba(
    userId: string,
    data: PonudbaInsert
  ) {
    // Verify obrtnik owns this profile
    const supabase = await createClient()
    const { data: obrtnikProfile } = await supabase
      .from('obrtnik_profiles')
      .select('id')
      .eq('id', data.obrtnik_id)
      .eq('id', userId)
      .maybeSingle()

    if (!obrtnikProfile) {
      throw new ServiceError(
        'You do not own this obrtnik profile',
        'FORBIDDEN',
        403
      )
    }

    const ponudba = await createPonudba(data)

    if (!ponudba) {
      throw new ServiceError(
        'Failed to create ponudba',
        'DB_ERROR',
        500
      )
    }

    return ponudba
  },
}
