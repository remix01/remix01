/**
 * Partner Service - Extracted from partner-related routes
 * Handles partner (obrtnik) operations
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { ServiceError } from './serviceError'

export const partnerService = {
  /**
   * Get partner's assigned inquiries
   * Business logic extracted from GET /api/partner/povprasevanja
   */
  async getPartnerInquiries(
    partnerId: string,
    options?: {
      status?: string
      page?: number
      limit?: number
    }
  ) {
    const page = options?.page || 1
    const limit = options?.limit || 10
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('povprasevanja')
      .select('*', { count: 'exact' })
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (options?.status && options.status !== 'vse') {
      query = query.eq('status', options.status)
    }

    const { data, count, error } = await query

    if (error) {
      throw new ServiceError(
        error.message,
        'DB_ERROR',
        500
      )
    }

    return {
      data: data || [],
      count: count || 0,
      page,
      limit,
    }
  },

  /**
   * Get all obrtniki with optional filters
   */
  async getObrtniki(options?: {
    storitev?: string
    lokacija?: string
    includeUnverified?: boolean
  }) {
    let query = supabaseAdmin
      .from('obrtniki')
      .select('id,ime,priimek,podjetje,specialnosti,lokacije,cena_min,cena_max,ocena,stevilo_ocen,leta_izkusenj,profilna_slika_url,status')
      .order('ocena', { ascending: false })

    // Filter by verification status
    if (!options?.includeUnverified) {
      query = query.eq('status', 'verified')
    }

    if (options?.storitev) {
      query = query.contains('specialnosti', [options.storitev])
    }

    if (options?.lokacija) {
      query = query.overlaps('lokacije', [options.lokacija])
    }

    const { data, error } = await query

    if (error) {
      throw new ServiceError(
        error.message,
        'DB_ERROR',
        500
      )
    }

    return data || []
  },

  /**
   * Create new obrtnik entry
   */
  async createObrtnik(data: any) {
    const { data: result, error } = await supabaseAdmin
      .from('obrtniki')
      .insert(data)
      .select()
      .single()

    if (error) {
      throw new ServiceError(
        error.message,
        'DB_ERROR',
        500
      )
    }

    return result
  },
}
