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
   *
   * Caller (userId) must be the obrtnik submitting the offer.
   * partner_id must equal userId (obrtnik_profiles.id === auth.uid()).
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

    // Verify caller owns the partner profile (obrtnik_profiles.id === auth.uid())
    if (data.partner_id !== userId) {
      throw new ServiceError(
        'Unauthorized - partner_id must match your user id',
        'FORBIDDEN',
        403
      )
    }

    // Verify obrtnik profile exists
    const { data: partnerProfile } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (!partnerProfile) {
      throw new ServiceError(
        'Obrtnik profile not found',
        'FORBIDDEN',
        403
      )
    }

    // Verify the request exists and is open for offers
    const { data: inquiry } = await supabaseAdmin
      .from('povprasevanja')
      .select('id, status')
      .eq('id', data.request_id)
      .maybeSingle()

    if (!inquiry) {
      throw new ServiceError(
        'Povpraševanje ni najdeno',
        'NOT_FOUND',
        404
      )
    }

    if (!['odprto', 'new', 'matched'].includes(inquiry.status)) {
      throw new ServiceError(
        'Povpraševanje ne sprejema več ponudb',
        'VALIDATION',
        400
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
   *
   * Caller (userId) must own the obrtnik profile (obrtnik_profiles.id === auth.uid()).
   */
  async createPonudba(
    userId: string,
    data: PonudbaInsert
  ) {
    // Verify caller owns the obrtnik profile (obrtnik_profiles.id === auth.uid())
    if (data.obrtnik_id !== userId) {
      throw new ServiceError(
        'You do not own this obrtnik profile',
        'FORBIDDEN',
        403
      )
    }

    // Verify obrtnik profile exists
    const supabase = await createClient()
    const { data: obrtnikProfile } = await supabase
      .from('obrtnik_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (!obrtnikProfile) {
      throw new ServiceError(
        'Obrtnik profile not found',
        'FORBIDDEN',
        403
      )
    }

    // Verify povprasevanje exists and allows new offers
    const { data: pov } = await supabaseAdmin
      .from('povprasevanja')
      .select('id, status')
      .eq('id', data.povprasevanje_id)
      .maybeSingle()

    if (!pov) {
      throw new ServiceError(
        'Povpraševanje ni najdeno',
        'NOT_FOUND',
        404
      )
    }

    if (!['odprto', 'new', 'matched'].includes(pov.status)) {
      throw new ServiceError(
        'Povpraševanje ne sprejema več ponudb',
        'VALIDATION',
        400
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
