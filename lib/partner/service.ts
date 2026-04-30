import { supabaseAdmin } from '@/lib/supabase-admin'
import { transitionOnboardingState } from '@/lib/onboarding/state-machine'

// Maps legacy partners field names (used in PATCH body) to obrtnik_profiles columns
const LEGACY_FIELD_MAP: Record<string, string> = {
  bio: 'description',
  podjetje: 'business_name',
  leta_izkusenj: 'years_experience',
}

// Direct canonical field names accepted in PATCH body
const CANONICAL_FIELDS = [
  'description',
  'business_name',
  'years_experience',
  'hourly_rate',
  'tagline',
  'website_url',
  'facebook_url',
  'instagram_url',
  'service_radius_km',
]

export const canonicalPartnerService = {
  /**
   * Updates obrtnik_profiles for a canonical partner.
   * Accepts both legacy field names (bio, podjetje, leta_izkusenj) and canonical ones.
   * Single-write canonical — never touches the legacy partners table.
   */
  async updateProfile(partnerId: string, body: Record<string, unknown>) {
    const updates: Record<string, unknown> = {}

    for (const [legacy, canonical] of Object.entries(LEGACY_FIELD_MAP)) {
      if (body[legacy] !== undefined) updates[canonical] = body[legacy]
    }

    for (const field of CANONICAL_FIELDS) {
      if (body[field] !== undefined) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) return null

    const { data, error } = await supabaseAdmin
      .from('obrtnik_profiles')
      .update(updates)
      .eq('id', partnerId)
      .select()
      .single()

    if (error) throw error

    await transitionOnboardingState(partnerId)
    return data
  },

  /**
   * KPI stats for a partner's dashboard.
   * Uses obrtnik_id (canonical column) instead of the legacy partner_id column.
   */
  async getStats(partnerId: string) {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { count: skupaj },
      { count: nova },
      { count: aktivna },
      { count: zakljucena },
      { data: zadnjih30 },
      { data: ocene },
    ] = await Promise.all([
      supabaseAdmin
        .from('povprasevanja')
        .select('*', { count: 'exact', head: true })
        .eq('obrtnik_id', partnerId),
      supabaseAdmin
        .from('povprasevanja')
        .select('*', { count: 'exact', head: true })
        .eq('obrtnik_id', partnerId)
        .eq('status', 'dodeljeno'),
      supabaseAdmin
        .from('povprasevanja')
        .select('*', { count: 'exact', head: true })
        .eq('obrtnik_id', partnerId)
        .in('status', ['sprejeto', 'v_izvajanju']),
      supabaseAdmin
        .from('povprasevanja')
        .select('*', { count: 'exact', head: true })
        .eq('obrtnik_id', partnerId)
        .eq('status', 'zakljuceno'),
      supabaseAdmin
        .from('povprasevanja')
        .select('created_at, status')
        .eq('obrtnik_id', partnerId)
        .gte('created_at', since30d),
      supabaseAdmin.from('ocene').select('ocena').eq('partner_id', partnerId),
    ])

    const povprecnaOcena =
      ocene && ocene.length > 0
        ? (ocene.reduce((sum: number, o: any) => sum + o.ocena, 0) / ocene.length).toFixed(1)
        : null

    return {
      skupaj,
      nova,
      aktivna,
      zakljucena,
      povprecnaOcena,
      steviloOcen: ocene?.length ?? 0,
      zadnjih30,
    }
  },

  /**
   * Paginated inquiry list for a partner.
   * Uses obrtnik_id (canonical) instead of legacy partner_id.
   */
  async getInquiries(
    partnerId: string,
    options?: { status?: string; page?: number; limit?: number }
  ) {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 10
    const offset = (page - 1) * limit

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
    if (error) throw error

    return { data: data ?? [], count: count ?? 0, page, limit }
  },
}
