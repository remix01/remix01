'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import type { Stranka, Partner, AdminStats, ChartData } from '@/types/admin'

export async function getAdminStats(): Promise<AdminStats> {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

  const [
    { count: skupajStranke },
    { count: skupajPartnerji },
    { count: strankeLastMonth },
    { count: strankeMonthBefore },
    { count: partnerjiLastMonth },
    { count: partnerjiMonthBefore },
    { count: cakajoceVerifikacije },
  ] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'narocnik'),
    supabaseAdmin
      .from('obrtnik_profiles')
      .select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'narocnik')
      .gte('created_at', lastMonth.toISOString()),
    supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'narocnik')
      .gte('created_at', twoMonthsAgo.toISOString())
      .lt('created_at', lastMonth.toISOString()),
    supabaseAdmin
      .from('obrtnik_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', lastMonth.toISOString()),
    supabaseAdmin
      .from('obrtnik_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twoMonthsAgo.toISOString())
      .lt('created_at', lastMonth.toISOString()),
    supabaseAdmin
      .from('obrtnik_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', false),
  ])

  const rastStrank = (strankeMonthBefore || 0) > 0
    ? Math.round((((strankeLastMonth || 0) - (strankeMonthBefore || 0)) / (strankeMonthBefore || 0)) * 100)
    : 100

  const rastPartnerjev = (partnerjiMonthBefore || 0) > 0
    ? Math.round((((partnerjiLastMonth || 0) - (partnerjiMonthBefore || 0)) / (partnerjiMonthBefore || 0)) * 100)
    : 100

  return {
    skupajStranke: skupajStranke || 0,
    skupajPartnerji: skupajPartnerji || 0,
    cakajoceVerifikacije: cakajoceVerifikacije || 0,
    aktivniUporabniki: (skupajStranke || 0) + (skupajPartnerji || 0),
    rastStrank,
    rastPartnerjev,
  }
}

export async function getStranke(
  filter?: string,
  sortBy: 'createdAt' | 'name' = 'createdAt',
  page = 1,
  pageSize = 10
) {
  const skip = (page - 1) * pageSize

  let query = supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('role', 'narocnik')

  if (filter) {
    query = query.or(`full_name.ilike.%${filter}%,email.ilike.%${filter}%`)
  }

  const { data: users, count: total } = await query
    .order(sortBy === 'createdAt' ? 'created_at' : 'full_name', { ascending: sortBy !== 'createdAt' })
    .range(skip, skip + pageSize - 1)

  const stranke: Stranka[] = (users || []).map((user: any) => {
    const fullName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()
    return {
      id: user.id,
      ime: fullName.split(' ')[0] || user.email?.split('@')[0] || '',
      priimek: fullName.split(' ').slice(1).join(' ') || '',
      email: user.email,
      telefon: user.phone || undefined,
      createdAt: new Date(user.created_at),
      status: 'AKTIVEN' as const,
      narocil: 0,
    }
  })

  return { stranke, total: total || 0, pages: Math.ceil((total || 0) / pageSize) }
}

export async function getPartnerji(
  filter?: string,
  statusFilter?: string,
  sortBy: 'createdAt' | 'ocena' = 'createdAt',
  page = 1,
  pageSize = 10
) {
  const skip = (page - 1) * pageSize

  let query = supabaseAdmin
    .from('obrtnik_profiles')
    .select('*', { count: 'exact' })

  if (statusFilter === 'PENDING') {
    query = query.eq('is_verified', false)
  } else if (statusFilter === 'AKTIVEN') {
    query = query.eq('is_verified', true)
  }

  const { data: obrtniki, count: total } = await query
    .order(sortBy === 'createdAt' ? 'created_at' : 'avg_rating', { ascending: sortBy !== 'createdAt' })
    .range(skip, skip + pageSize - 1)

  const ids = (obrtniki || []).map((o: any) => o.id)

  // Fetch email/phone from profiles (obrtnik_profiles has no email column)
  let profileMap: Record<string, { email: string; phone: string | null }> = {}
  if (ids.length > 0) {
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('id, email, phone')
      .in('id', ids)
    profileMap = Object.fromEntries((profileData || []).map((p: any) => [p.id, p]))
  }

  let partnerji: Partner[] = (obrtniki || []).map((profile: any) => ({
    id: profile.id,
    ime: profile.business_name || '',
    podjetje: profile.business_name,
    tip: 'PREVOZNIK' as const,
    email: profileMap[profile.id]?.email || '-',
    telefon: profileMap[profile.id]?.phone || undefined,
    createdAt: new Date(profile.created_at),
    status: profile.is_verified ? 'AKTIVEN' : 'PENDING',
    ocena: profile.avg_rating || 0,
    steviloPrevozov: 0,
  }))

  // Apply filter after join (search on business_name or email)
  if (filter) {
    const f = filter.toLowerCase()
    partnerji = partnerji.filter(p =>
      p.ime.toLowerCase().includes(f) || p.email.toLowerCase().includes(f)
    )
  }

  return { partnerji, total: total || 0, pages: Math.ceil((total || 0) / pageSize) }
}

export async function odobriPartnerja(id: string) {
  await supabaseAdmin
    .from('obrtnik_profiles')
    .update({ is_verified: true })
    .eq('id', id)
  revalidatePath('/admin/partnerji')
}

export async function zavrniPartnerja(id: string, razlog: string) {
  await supabaseAdmin
    .from('obrtnik_profiles')
    .update({ is_verified: false })
    .eq('id', id)
  revalidatePath('/admin/partnerji')
}

export async function suspendiranjPartnerja(id: string, razlog?: string) {
  await supabaseAdmin
    .from('obrtnik_profiles')
    .update({ is_available: false })
    .eq('id', id)
  revalidatePath('/admin/partnerji')
}

export async function getStranka(id: string): Promise<Stranka | null> {
  const { data: user } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'narocnik')
    .single()

  if (!user) return null

  const fullName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()
  return {
    id: user.id,
    ime: fullName.split(' ')[0] || user.email?.split('@')[0] || '',
    priimek: fullName.split(' ').slice(1).join(' ') || '',
    email: user.email,
    telefon: user.phone || undefined,
    createdAt: new Date(user.created_at),
    status: 'AKTIVEN' as const,
    narocil: 0,
  }
}

export async function getPartner(id: string): Promise<Partner | null> {
  const [{ data: profile }, { data: profileData }] = await Promise.all([
    supabaseAdmin.from('obrtnik_profiles').select('*').eq('id', id).single(),
    supabaseAdmin.from('profiles').select('email, phone').eq('id', id).maybeSingle(),
  ])

  if (!profile) return null

  return {
    id: profile.id,
    ime: profile.business_name || '',
    podjetje: profile.business_name,
    tip: 'PREVOZNIK' as const,
    email: profileData?.email || '-',
    telefon: profileData?.phone || undefined,
    createdAt: new Date(profile.created_at),
    status: profile.is_verified ? 'AKTIVEN' : 'PENDING',
    ocena: profile.avg_rating || 0,
    steviloPrevozov: 0,
  }
}

export async function updateStrankaStatus(id: string, status: 'AKTIVEN' | 'SUSPENDIRAN') {
  await supabaseAdmin
    .from('profiles')
    .update({ is_suspended: status === 'SUSPENDIRAN' })
    .eq('id', id)
  revalidatePath(`/admin/stranke/${id}`)
  revalidatePath('/admin/stranke')
}

export async function deleteStranka(id: string) {
  await supabaseAdmin.from('profiles').delete().eq('id', id)
  revalidatePath('/admin/stranke')
}

export async function deletePartner(id: string) {
  await supabaseAdmin.from('obrtnik_profiles').delete().eq('id', id)
  revalidatePath('/admin/partnerji')
}

export async function reaktivirajPartnerja(id: string) {
  await supabaseAdmin
    .from('obrtnik_profiles')
    .update({ is_available: true })
    .eq('id', id)
  revalidatePath(`/admin/partnerji/${id}`)
  revalidatePath('/admin/partnerji')
}

export async function bulkSuspendStranke(ids: string[]): Promise<void> {
  await supabaseAdmin
    .from('profiles')
    .update({ is_suspended: true })
    .in('id', ids)
  revalidatePath('/admin/stranke')
}

export async function bulkDeleteStranke(ids: string[]): Promise<void> {
  await supabaseAdmin.from('profiles').delete().in('id', ids)
  revalidatePath('/admin/stranke')
}

export async function exportStrankeCSV(): Promise<string> {
  const { data: users } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('role', 'narocnik')
    .order('created_at', { ascending: false })

  const header = 'ID,Ime,Priimek,Email,Telefon,Status,Datum registracije\n'
  const rows = (users || []).map((user: any) => {
    const [ime, ...priimekParts] = (user.full_name || '').split(' ')
    const priimek = priimekParts.join(' ')
    return `"${user.id}","${ime}","${priimek}","${user.email}","${user.phone || ''}","AKTIVEN","${new Date(user.created_at).toISOString().split('T')[0]}"`
  }).join('\n')

  return header + rows
}

export async function dodajStranko(data: {
  email: string
  ime: string
  priimek: string
  telefon?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
      user_metadata: { first_name: data.ime, last_name: data.priimek },
    })
    if (authError) return { success: false, error: authError.message }

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      email: data.email,
      full_name: `${data.ime} ${data.priimek}`.trim(),
      phone: data.telefon || null,
      role: 'narocnik',
    })
    if (profileError) return { success: false, error: profileError.message }

    revalidatePath('/admin/stranke')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Napaka pri dodajanju stranke' }
  }
}

export async function dodajPartnerja(data: {
  email: string
  business_name: string
  telefon?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
      user_metadata: { business_name: data.business_name },
    })
    if (authError) return { success: false, error: authError.message }

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      email: data.email,
      full_name: data.business_name,
      phone: data.telefon || null,
      role: 'obrtnik',
    })
    if (profileError) return { success: false, error: profileError.message }

    const { error: obrtnikError } = await supabaseAdmin.from('obrtnik_profiles').upsert({
      id: authData.user.id,
      email: data.email,
      business_name: data.business_name,
      phone: data.telefon || null,
      is_verified: false,
      is_available: false,
      avg_rating: 0,
      total_reviews: 0,
    })
    if (obrtnikError) return { success: false, error: obrtnikError.message }

    revalidatePath('/admin/partnerji')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Napaka pri dodajanju partnerja' }
  }
}

export async function getChartData(): Promise<{ stranke: ChartData[]; partnerji: ChartData[] }> {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec']
  const now = new Date()
  const chartData: { stranke: ChartData[]; partnerji: ChartData[] } = {
    stranke: [],
    partnerji: [],
  }

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

    const [strankeData, partnerjiData] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'narocnik')
        .gte('created_at', monthDate.toISOString())
        .lt('created_at', nextMonthDate.toISOString()),
      supabaseAdmin
        .from('obrtnik_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthDate.toISOString())
        .lt('created_at', nextMonthDate.toISOString()),
    ])

    chartData.stranke.push({
      mesec: months[monthDate.getMonth()],
      vrednost: strankeData.count || 0,
    })

    chartData.partnerji.push({
      mesec: months[monthDate.getMonth()],
      vrednost: partnerjiData.count || 0,
    })
  }

  return chartData
}
