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

    // Canonical column is obrtnik_id; fall back to partner_id for legacy rows
    let query = supabaseAdmin
      .from('povprasevanja')
      .select('*', { count: 'exact' })
      .eq('obrtnik_id', partnerId)
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
    const runProfilesQuery = async (selectColumns: string) => {
      let profileQuery = supabaseAdmin
        .from('obrtnik_profiles')
        .select(selectColumns)
        .order('avg_rating', { ascending: false })

      if (!options?.includeUnverified) {
        profileQuery = profileQuery.eq('is_verified', true)
      }

      return profileQuery
    }

    const profileSelectVariants = [
      'id,business_name,phone,avg_rating,is_verified,specialties,profiles!inner(full_name),service_areas(city,is_active),obrtnik_categories(category:categories(name))',
      'id,business_name,phone,avg_rating,is_verified,specialties,profiles!inner(full_name),obrtnik_categories(category:categories(name))',
      'id,business_name,phone,avg_rating,is_verified,specialties,profiles!inner(full_name),service_areas(city,is_active)',
      'id,business_name,phone,avg_rating,is_verified,specialties,profiles!inner(full_name)',
      'id,business_name,phone,avg_rating,is_verified,specialnosti,profiles!inner(full_name),service_areas(city,is_active),obrtnik_categories(category:categories(name))',
      'id,business_name,phone,avg_rating,is_verified,specialnosti,profiles!inner(full_name),obrtnik_categories(category:categories(name))',
      'id,business_name,phone,avg_rating,is_verified,specialnosti,profiles!inner(full_name),service_areas(city,is_active)',
      'id,business_name,phone,avg_rating,is_verified,specialnosti,profiles!inner(full_name)',
      'id,business_name,phone,avg_rating,is_verified,profiles!inner(full_name),service_areas(city,is_active),obrtnik_categories(category:categories(name))',
      'id,business_name,phone,avg_rating,is_verified,profiles!inner(full_name),obrtnik_categories(category:categories(name))',
    ]

    let activeProfilesResult: Awaited<ReturnType<typeof runProfilesQuery>> | null = null
    let lastCompatibilityError: any = null

    for (const selectColumns of profileSelectVariants) {
      const result = await runProfilesQuery(selectColumns)
      if (!result.error) {
        activeProfilesResult = result
        break
      }

      if (!isSchemaCompatibilityError(result.error)) {
        throw new ServiceError(result.error.message, 'DB_ERROR', 500)
      }

      lastCompatibilityError = result.error
    }

    if (activeProfilesResult && !activeProfilesResult.error) {
      const mapped = (activeProfilesResult.data || []).map((row: any) => {
        const fullName = row.profiles?.full_name || ''
        const [ime = '', ...rest] = fullName.trim().split(' ')
        const categorySpecialnosti = Array.isArray(row.obrtnik_categories)
          ? row.obrtnik_categories
              .map((entry: any) => entry?.category?.name)
              .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
          : []
        const rawSpecialnosti = Array.isArray(row.specialties)
          ? row.specialties
          : Array.isArray(row.specialnosti)
            ? row.specialnosti
            : categorySpecialnosti
        const rowSpecialnosti = rawSpecialnosti
          .filter((value: unknown): value is string => typeof value === 'string')
          .map((value: string) => value.trim())
          .filter((value: string) => value.length > 0)
        const lokacije = Array.isArray(row.service_areas)
          ? row.service_areas
              .filter((area: any) => area?.is_active !== false)
              .map((area: any) => area?.city)
              .filter((city: unknown): city is string => typeof city === 'string' && city.length > 0)
          : []
        return {
          id: row.id,
          ime,
          priimek: rest.join(' '),
          podjetje: row.business_name ?? null,
          email: null,
          telefon: row.phone ?? null,
          specialnosti: rowSpecialnosti,
          lokacije,
          cena_min: null,
          cena_max: null,
          ocena: Number(row.avg_rating ?? 0),
          stevilo_ocen: 0,
          leta_izkusenj: 0,
          profilna_slika_url: null,
          status: row.is_verified ? 'verified' : 'pending',
        }
      })

      const byStoritev = options?.storitev
        ? mapped.filter((item) =>
            (item.specialnosti || []).some((spec: string) => spec.toLowerCase() === options.storitev!.toLowerCase())
          )
        : mapped

      if (options?.lokacija) {
        const targetLokacija = options.lokacija.trim().toLowerCase()
        return byStoritev.filter((item) =>
          (item.lokacije || []).some((city: string) => city.trim().toLowerCase() === targetLokacija)
        )
      }

      return byStoritev
    }

    throw new ServiceError(lastCompatibilityError?.message || 'Failed to load obrtniki', 'DB_ERROR', 500)
  },

  /**
   * Create new obrtnik entry from legacy payload.
   * Accepts { email, ime, priimek, podjetje?, telefon?, storitve?, lokacija? }
   * and creates auth user + profiles + obrtnik_profiles records.
   */
  async createObrtnik(data: {
    email: string
    ime: string
    priimek: string
    podjetje?: string
    telefon?: string
    storitve?: string[]
    lokacija?: string
  }) {
    const email = data.email.trim().toLowerCase()
    const fullName = `${data.ime.trim()} ${data.priimek.trim()}`.trim()
    const businessName = data.podjetje?.trim() || fullName

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { first_name: data.ime, last_name: data.priimek },
    })
    if (authError) throw new ServiceError(authError.message, 'DB_ERROR', 500)

    const userId = authData.user.id

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email,
      full_name: fullName,
      phone: data.telefon || null,
      location_city: data.lokacija || null,
      role: 'obrtnik',
    })
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw new ServiceError(profileError.message, 'DB_ERROR', 500)
    }

    const { data: result, error: obrtnikError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .insert({
        id: userId,
        business_name: businessName,
        is_verified: false,
        verification_status: 'pending',
        is_available: false,
      })
      .select()
      .single()

    if (obrtnikError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw new ServiceError(obrtnikError.message, 'DB_ERROR', 500)
    }

    return result
  },
}
