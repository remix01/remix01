'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import type { Stranka, Partner, AdminStats, ChartData } from '@/types/admin'

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient()
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
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'narocnik'),
    supabase
      .from('obrtnik_profiles')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'narocnik')
      .gte('created_at', lastMonth.toISOString()),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'narocnik')
      .gte('created_at', twoMonthsAgo.toISOString())
      .lt('created_at', lastMonth.toISOString()),
    supabase
      .from('obrtnik_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', lastMonth.toISOString()),
    supabase
      .from('obrtnik_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twoMonthsAgo.toISOString())
      .lt('created_at', lastMonth.toISOString()),
    supabase
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

  const stranke: Stranka[] = (users || []).map((user: any) => ({
    id: user.id,
    ime: user.full_name?.split(' ')[0] || '',
    priimek: user.full_name?.split(' ').slice(1).join(' ') || '',
    email: user.email,
    telefon: user.phone || undefined,
    createdAt: new Date(user.created_at),
    status: 'AKTIVEN' as const,
    narocil: 0,
  }))

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

  // obrtnik_profiles has no email/phone columns — filter only by business_name
  let query = supabaseAdmin
    .from('obrtnik_profiles')
    .select('*', { count: 'exact' })

  if (filter) {
    query = query.ilike('business_name', `%${filter}%`)
  }

  if (statusFilter === 'PENDING') {
    query = query.eq('is_verified', false)
  } else if (statusFilter === 'AKTIVEN') {
    query = query.eq('is_verified', true)
  }

  const { data: profiles, count: total } = await query
    .order(sortBy === 'createdAt' ? 'created_at' : 'avg_rating', { ascending: sortBy !== 'createdAt' })
    .range(skip, skip + pageSize - 1)

  if (!profiles || profiles.length === 0) {
    return { partnerji: [], total: 0, pages: 0 }
  }

  // Fetch email/phone from profiles table (same id FK)
  const ids = profiles.map((p: any) => p.id)
  const { data: userProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, phone')
    .in('id', ids)

  const profileMap = new Map((userProfiles || []).map((p: any) => [p.id, p]))

  const partnerji: Partner[] = profiles.map((profile: any) => {
    const userProfile = profileMap.get(profile.id)
    return {
      id: profile.id,
      ime: profile.business_name || '',
      podjetje: profile.business_name,
      tip: 'PREVOZNIK' as const,
      email: userProfile?.email || '',
      telefon: userProfile?.phone || undefined,
      createdAt: new Date(profile.created_at),
      status: profile.is_verified ? 'AKTIVEN' : 'PENDING',
      ocena: profile.avg_rating || 0,
      steviloPrevozov: 0,
    }
  })

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

  return {
    id: user.id,
    ime: user.full_name?.split(' ')[0] || '',
    priimek: user.full_name?.split(' ').slice(1).join(' ') || '',
    email: user.email,
    telefon: user.phone || undefined,
    createdAt: new Date(user.created_at),
    status: 'AKTIVEN' as const,
    narocil: 0,
  }
}

export async function getPartner(id: string): Promise<Partner | null> {
  // Fetch obrtnik_profiles and profiles in parallel
  const [{ data: profile }, { data: userProfile }] = await Promise.all([
    supabaseAdmin
      .from('obrtnik_profiles')
      .select('*')
      .eq('id', id)
      .single(),
    supabaseAdmin
      .from('profiles')
      .select('id, email, phone')
      .eq('id', id)
      .single(),
  ])

  if (!profile) return null

  return {
    id: profile.id,
    ime: profile.business_name || '',
    podjetje: profile.business_name,
    tip: 'PREVOZNIK' as const,
    email: userProfile?.email || '',
    telefon: userProfile?.phone || undefined,
    createdAt: new Date(profile.created_at),
    status: profile.is_verified ? 'AKTIVEN' : 'PENDING',
    ocena: profile.avg_rating || 0,
    steviloPrevozov: 0,
  }
}

export async function updateStrankaStatus(id: string, status: 'AKTIVEN' | 'SUSPENDIRAN') {
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

export async function updatePartner(id: string, data: {
  business_name?: string
  email?: string
  phone?: string
  description?: string
}) {
  // Update obrtnik_profiles: business_name and description only
  const obrtnikUpdates: Record<string, unknown> = {}
  if (data.business_name !== undefined) obrtnikUpdates.business_name = data.business_name
  if (data.description !== undefined) obrtnikUpdates.description = data.description

  if (Object.keys(obrtnikUpdates).length > 0) {
    const { error } = await supabaseAdmin
      .from('obrtnik_profiles')
      .update(obrtnikUpdates)
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  // Update profiles: email, phone, full_name (same id FK)
  const profileUpdates: Record<string, unknown> = {}
  if (data.email !== undefined) profileUpdates.email = data.email
  if (data.phone !== undefined) profileUpdates.phone = data.phone
  if (data.business_name !== undefined) profileUpdates.full_name = data.business_name

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdates)
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  revalidatePath(`/admin/partnerji/${id}`)
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
    let userId: string

    // Try to create auth user; if email already exists, find the existing user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
      user_metadata: { first_name: data.ime, last_name: data.priimek },
    })

    if (authError) {
      if (authError.message?.toLowerCase().includes('already been registered') ||
          authError.message?.toLowerCase().includes('already exists')) {
        const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        if (listError) return { success: false, error: listError.message }
        const existing = existingUsers.users.find(u => u.email === data.email)
        if (!existing) return { success: false, error: 'Uporabnik ne obstaja' }
        userId = existing.id
      } else {
        return { success: false, error: authError.message }
      }
    } else {
      userId = authData.user.id
    }

    // Upsert profile
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
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
    let userId: string

    // Try to create auth user; if email already exists, look up the existing user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
      user_metadata: { business_name: data.business_name },
    })

    if (authError) {
      // If user already exists, find them by email
      if (authError.message?.toLowerCase().includes('already been registered') ||
          authError.message?.toLowerCase().includes('already exists')) {
        const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        if (listError) return { success: false, error: listError.message }
        const existing = existingUsers.users.find(u => u.email === data.email)
        if (!existing) return { success: false, error: 'Uporabnik ne obstaja' }
        userId = existing.id
      } else {
        return { success: false, error: authError.message }
      }
    } else {
      userId = authData.user.id
    }

    // Upsert profiles entry (email and phone stored here)
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email: data.email,
      full_name: data.business_name,
      phone: data.telefon || null,
      role: 'obrtnik',
    })
    if (profileError) return { success: false, error: profileError.message }

    // Upsert obrtnik_profiles entry — NO email/phone columns in this table
    const { error: obrtnikError } = await supabaseAdmin.from('obrtnik_profiles').upsert({
      id: userId,
      business_name: data.business_name,
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
  const supabase = await createClient()
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
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'narocnik')
        .gte('created_at', monthDate.toISOString())
        .lt('created_at', nextMonthDate.toISOString()),
      supabase
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
