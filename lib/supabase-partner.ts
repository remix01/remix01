'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase-admin'

/**
 * Get current logged-in partner (obrtnik) from session
 */
export async function getPartner() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const { data: obrtnik } = await supabaseAdmin
    .from('obrtniki')
    .select('*, partner_paketi(*)')
    .eq('user_id', session.user.id)
    .single()

  return obrtnik
}

/**
 * Get partner's stats for dashboard
 */
export async function getPartnerStats(obrtnikId: string) {
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
      .eq('obrtnik_id', obrtnikId),
    supabaseAdmin.from('povprasevanja')
      .select('*', { count: 'exact', head: true })
      .eq('obrtnik_id', obrtnikId).eq('status', 'dodeljeno'),
    supabaseAdmin.from('povprasevanja')
      .select('*', { count: 'exact', head: true })
      .eq('obrtnik_id', obrtnikId)
      .in('status', ['sprejeto', 'v_izvajanju']),
    supabaseAdmin.from('povprasevanja')
      .select('*', { count: 'exact', head: true })
      .eq('obrtnik_id', obrtnikId).eq('status', 'zakljuceno'),
    supabaseAdmin.from('povprasevanja')
      .select('created_at, status')
      .eq('obrtnik_id', obrtnikId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabaseAdmin.from('ocene')
      .select('ocena')
      .eq('obrtnik_id', obrtnikId),
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
export async function getPartnerInquiries(obrtnikId: string, status?: string, page = 1, limit = 10) {
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('povprasevanja')
    .select('*', { count: 'exact' })
    .eq('obrtnik_id', obrtnikId)
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
export async function getPartnerReviews(obrtnikId: string, limit = 10) {
  const { data, error } = await supabaseAdmin
    .from('ocene')
    .select('*')
    .eq('obrtnik_id', obrtnikId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}
