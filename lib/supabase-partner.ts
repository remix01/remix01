'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from './env'
import { supabaseAdmin } from './supabase-admin'

/**
 * Get current logged-in partner from session.
 *
 * Resolution order (spec section 1 — transitional dual-read):
 *   1. obrtnik_profiles.id = user.id  (canonical)
 *   2. legacy partners table           (compatibility fallback, emits warning)
 */
export async function getPartner() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // silence
          }
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  // Step 1: canonical path
  const { data: canonical } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('id, business_name, description, subscription_tier, stripe_customer_id, is_verified, avg_rating, hourly_rate, years_experience, tagline')
    .eq('id', session.user.id)
    .maybeSingle()

  if (canonical) {
    return { ...canonical, user_id: session.user.id }
  }

  // Step 2: legacy fallback — emit structured warning so migrations can be tracked
  console.warn(
    JSON.stringify({
      level: 'warn',
      code: 'PARTNER_ID_MAPPING_FALLBACK',
      path: 'partners.user_id',
      userId: session.user.id,
      message: 'Resolved via legacy partners table — canonical obrtnik_profiles row missing',
    })
  )

  const { data: legacy } = await supabaseAdmin
    .from('partners')
    .select('*, partner_paketi(*)')
    .eq('user_id', session.user.id)
    .maybeSingle()

  return legacy
}

/**
 * Get partner's stats for dashboard
 */
export async function getPartnerStats(partnerId: string) {
  const [
    { count: skupaj },
    { count: nova },
    { count: aktivna },
    { count: zakljucena },
    { data: zadnjih30 },
    { data: ocene },
  ] = await Promise.all([
    supabaseAdmin.from('povprasevanja')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partnerId),
    supabaseAdmin.from('povprasevanja')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partnerId).eq('status', 'dodeljeno'),
    supabaseAdmin.from('povprasevanja')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partnerId)
      .in('status', ['sprejeto', 'v_izvajanju']),
    supabaseAdmin.from('povprasevanja')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partnerId).eq('status', 'zakljuceno'),
    supabaseAdmin.from('povprasevanja')
      .select('created_at, status')
      .eq('partner_id', partnerId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabaseAdmin.from('ocene')
      .select('ocena')
      .eq('partner_id', partnerId),
  ])

  const povprecnaOcena = ocene && ocene.length > 0
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
}

/**
 * Get partner's inquiries with filtering
 */
export async function getPartnerInquiries(partnerId: string, status?: string, page = 1, limit = 10) {
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('povprasevanja')
    .select('*', { count: 'exact' })
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== 'vse') {
    query = query.eq('status', status)
  }

  return query
}

/**
 * Get partner's reviews
 */
export async function getPartnerReviews(partnerId: string, limit = 10) {
  const { data, error } = await supabaseAdmin
    .from('ocene')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}
