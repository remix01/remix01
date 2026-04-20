/**
 * Partner Service - Extracted from partner-related routes
 * Handles partner (obrtnik) operations
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { ServiceError } from './serviceError'

const isSchemaCompatibilityError = (error: any) => {
  const code = String(error?.code || '')
  const message = String(error?.message || '').toLowerCase()

  return (
    code === 'PGRST204' || // missing column in select list
    code === '42703' || // undefined column
    code === '42P01' || // undefined table
    message.includes('column') ||
    message.includes('relation') ||
    message.includes('schema cache')
  )
}

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
    const runLegacyQuery = async (selectColumns: string) => {
      let query = supabaseAdmin
        .from('obrtniki')
        .select(selectColumns)
        .order('ocena', { ascending: false })

      if (!options?.includeUnverified) {
        query = query.eq('status', 'verified')
      }

      if (options?.storitev) {
        query = query.contains('specialnosti', [options.storitev])
      }

      if (options?.lokacija) {
        query = query.overlaps('lokacije', [options.lokacija])
      }

      return query
    }

    const primaryColumns = 'id,ime,priimek,podjetje,email,telefon,specialnosti,lokacije,cena_min,cena_max,ocena,stevilo_ocen,leta_izkusenj,profilna_slika_url,status'
    const fallbackColumns = 'id,ime,priimek,podjetje,email,telefon,specialnosti,lokacije,ocena,status'

    const primary = await runLegacyQuery(primaryColumns)
    if (!primary.error) return primary.data || []
    if (!isSchemaCompatibilityError(primary.error)) {
      throw new ServiceError(primary.error.message, 'DB_ERROR', 500)
    }

    const fallback = await runLegacyQuery(fallbackColumns)
    if (!fallback.error) {
      return (fallback.data || []).map((item: any) => ({
        ...item,
        cena_min: item.cena_min ?? null,
        cena_max: item.cena_max ?? null,
        stevilo_ocen: item.stevilo_ocen ?? 0,
        leta_izkusenj: item.leta_izkusenj ?? 0,
      }))
    }
    if (!isSchemaCompatibilityError(fallback.error)) {
      throw new ServiceError(fallback.error.message, 'DB_ERROR', 500)
    }

    // Newer schema fallback where contractor data is stored in obrtnik_profiles.
    let profileQuery = supabaseAdmin
      .from('obrtnik_profiles')
      .select('id,business_name,phone,avg_rating,is_verified,service_areas,specialties,profiles!inner(full_name)')
      .order('avg_rating', { ascending: false })

    if (!options?.includeUnverified) {
      profileQuery = profileQuery.eq('is_verified', true)
    }

    if (options?.storitev) {
      profileQuery = profileQuery.contains('specialties', [options.storitev])
    }

    if (options?.lokacija) {
      profileQuery = profileQuery.overlaps('service_areas', [options.lokacija])
    }

    const { data: profileData, error: profileError } = await profileQuery
    if (!profileError) {
      return (profileData || []).map((row: any) => {
        const fullName = row.profiles?.full_name || ''
        const [ime = '', ...rest] = fullName.trim().split(' ')
        return {
          id: row.id,
          ime,
          priimek: rest.join(' '),
          podjetje: row.business_name ?? null,
          email: null,
          telefon: row.phone ?? null,
          specialnosti: row.specialties ?? [],
          lokacije: row.service_areas ?? [],
          cena_min: null,
          cena_max: null,
          ocena: Number(row.avg_rating ?? 0),
          stevilo_ocen: 0,
          leta_izkusenj: 0,
          profilna_slika_url: null,
          status: row.is_verified ? 'verified' : 'pending',
        }
      })
    }

    throw new ServiceError(profileError.message, 'DB_ERROR', 500)
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
