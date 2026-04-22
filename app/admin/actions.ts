'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import type { Stranka, Partner, AdminStats, ChartData } from '@/types/admin'
import { requireAdmin } from '@/lib/admin-auth'

async function ensureAdminAccess() {
  await requireAdmin()
}

export async function getAdminStats(): Promise<AdminStats> {
  await ensureAdminAccess()
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
  await ensureAdminAccess()
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
  await ensureAdminAccess()
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

  let categoriesByObrtnik: Record<string, string> = {}
  if (ids.length > 0) {
    const { data: categoryLinks } = await supabaseAdmin
      .from('obrtnik_categories')
      .select('obrtnik_id, categories(name)')
      .in('obrtnik_id', ids)

    categoriesByObrtnik = Object.fromEntries(
      (categoryLinks || [])
        .map((row: any) => {
          const categoryName = Array.isArray(row.categories)
            ? row.categories[0]?.name
            : row.categories?.name
          return [row.obrtnik_id, categoryName]
        })
        .filter(([, categoryName]) => Boolean(categoryName))
    )
  }

  let partnerji: Partner[] = (obrtniki || []).map((profile: any) => ({
    id: profile.id,
    ime: profile.business_name || '',
    podjetje: profile.business_name,
    tip: categoriesByObrtnik[profile.id] || '—',
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
  await ensureAdminAccess()
  await supabaseAdmin
    .from('obrtnik_profiles')
    .update({ is_verified: true })
    .eq('id', id)
  revalidatePath('/admin/partnerji')
}

export async function zavrniPartnerja(id: string, razlog: string) {
  await ensureAdminAccess()
  await supabaseAdmin
    .from('obrtnik_profiles')
    .update({ is_verified: false })
    .eq('id', id)
  revalidatePath('/admin/partnerji')
}

export async function suspendiranjPartnerja(id: string, razlog?: string) {
  await ensureAdminAccess()
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
    lokacija: user.location_city || undefined,
    createdAt: new Date(user.created_at),
    status: user.is_suspended ? ('SUSPENDIRAN' as const) : ('AKTIVEN' as const),
    narocil: 0,
  }
}

export async function getPartner(id: string): Promise<Partner | null> {
  const [{ data: profile }, { data: profileData }, { data: categoryLink }] = await Promise.all([
    supabaseAdmin.from('obrtnik_profiles').select('*').eq('id', id).single(),
    supabaseAdmin.from('profiles').select('email, phone').eq('id', id).maybeSingle(),
    supabaseAdmin
      .from('obrtnik_categories')
      .select('categories(name)')
      .eq('obrtnik_id', id)
      .limit(1)
      .maybeSingle(),
  ])

  if (!profile) return null
  const linkedCategory: any = categoryLink?.categories
  const partnerTip = Array.isArray(linkedCategory)
    ? linkedCategory[0]?.name
    : linkedCategory?.name

  return {
    id: profile.id,
    ime: profile.business_name || '',
    podjetje: profile.business_name,
    tip: partnerTip || '—',
    email: profileData?.email || '-',
    telefon: profileData?.phone || undefined,
    createdAt: new Date(profile.created_at),
    status: profile.is_verified ? 'AKTIVEN' : 'PENDING',
    ocena: profile.avg_rating || 0,
    steviloPrevozov: 0,
  }
}

export async function getAdminPovprasevanja(
  search = '',
  statusFilter = 'vse',
  page = 1,
  pageSize = 20
) {
  await ensureAdminAccess()
  const offset = (page - 1) * pageSize
  let query = supabaseAdmin
    .from('povprasevanja')
    .select('id, title, location_city, status, created_at, category_id, narocnik_id', { count: 'exact' })

  if (statusFilter !== 'vse') {
    query = query.eq('status', statusFilter)
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,location_city.ilike.%${search}%`)
  }

  const { data: rows, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  const categoryIds = [...new Set((rows || []).map((r: any) => r.category_id).filter(Boolean))]
  const narocnikIds = [...new Set((rows || []).map((r: any) => r.narocnik_id).filter(Boolean))]

  const [{ data: categories }, { data: narocniki }] = await Promise.all([
    categoryIds.length
      ? supabaseAdmin.from('categories').select('id, name').in('id', categoryIds)
      : Promise.resolve({ data: [] as any[] }),
    narocnikIds.length
      ? supabaseAdmin.from('profiles').select('id, first_name, last_name, full_name, email').in('id', narocnikIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const categoryMap = Object.fromEntries((categories || []).map((c: any) => [c.id, c.name]))
  const narocnikMap = Object.fromEntries((narocniki || []).map((n: any) => [n.id, n]))

  const items = (rows || []).map((row: any) => {
    const narocnik = narocnikMap[row.narocnik_id]
    const fullName = narocnik?.full_name || `${narocnik?.first_name || ''} ${narocnik?.last_name || ''}`.trim()
    return {
      id: row.id,
      title: row.title,
      location_city: row.location_city,
      status: row.status,
      created_at: row.created_at,
      category_name: categoryMap[row.category_id] || '—',
      narocnik_name: fullName || '—',
      narocnik_email: narocnik?.email || '—',
    }
  })

  return {
    items,
    total: count || 0,
    pageSize,
  }
}

export async function getAdminOffers(
  search = '',
  statusFilter = 'vse',
  page = 1,
  pageSize = 20
) {
  await ensureAdminAccess()
  const offset = (page - 1) * pageSize

  let query = supabaseAdmin
    .from('ponudbe')
    .select('id, status, created_at, povprasevanje_id, obrtnik_id, cena, price_estimate, message', { count: 'exact' })

  if (statusFilter !== 'vse') {
    query = query.eq('status', statusFilter)
  }

  if (search) {
    query = query.or(`message.ilike.%${search}%`)
  }

  const { data: rows, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  const povprasevanjeIds = [...new Set((rows || []).map((row: any) => row.povprasevanje_id).filter(Boolean))]
  const obrtnikIds = [...new Set((rows || []).map((row: any) => row.obrtnik_id).filter(Boolean))]

  const [{ data: inquiries }, { data: craftworkers }] = await Promise.all([
    povprasevanjeIds.length
      ? supabaseAdmin
        .from('povprasevanja')
        .select('id, title, location_city')
        .in('id', povprasevanjeIds)
      : Promise.resolve({ data: [] as any[] }),
    obrtnikIds.length
      ? supabaseAdmin
        .from('obrtnik_profiles')
        .select('id, business_name')
        .in('id', obrtnikIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const inquiryMap = Object.fromEntries((inquiries || []).map((row: any) => [row.id, row]))
  const craftworkerMap = Object.fromEntries((craftworkers || []).map((row: any) => [row.id, row]))

  const items = (rows || [])
    .map((row: any) => {
      const inquiry = inquiryMap[row.povprasevanje_id]
      const craftworker = craftworkerMap[row.obrtnik_id]
      const amount = row.price_estimate ?? row.cena ?? null

      return {
        id: row.id,
        status: row.status || '—',
        created_at: row.created_at,
        amount,
        message: row.message || '',
        inquiry_id: row.povprasevanje_id,
        inquiry_title: inquiry?.title || '—',
        inquiry_city: inquiry?.location_city || '—',
        partner_id: row.obrtnik_id,
        partner_name: craftworker?.business_name || '—',
      }
    })
    .filter((item) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        item.id.toLowerCase().includes(q) ||
        item.inquiry_title.toLowerCase().includes(q) ||
        item.partner_name.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q)
      )
    })

  return {
    items,
    total: count || 0,
    pageSize,
  }
}

export async function updateStrankaStatus(id: string, status: 'AKTIVEN' | 'SUSPENDIRAN') {
  await ensureAdminAccess()
  await supabaseAdmin
    .from('profiles')
    .update({ is_suspended: status === 'SUSPENDIRAN' })
    .eq('id', id)
  revalidatePath(`/admin/stranke/${id}`)
  revalidatePath('/admin/stranke')
}

export async function deleteStranka(id: string) {
  await ensureAdminAccess()
  await supabaseAdmin.from('profiles').delete().eq('id', id)
  revalidatePath('/admin/stranke')
}

export async function updateStranka(
  id: string,
  data: { ime?: string; priimek?: string; telefon?: string; lokacija?: string }
): Promise<{ success: boolean; error?: string }> {
  await ensureAdminAccess()
  const updates: Record<string, string | null> = {}
  if (data.ime !== undefined || data.priimek !== undefined) {
    const { data: existing } = await supabaseAdmin.from('profiles').select('full_name').eq('id', id).single()
    const parts = (existing?.full_name || '').split(' ')
    const newIme = data.ime ?? parts[0] ?? ''
    const newPriimek = data.priimek ?? parts.slice(1).join(' ') ?? ''
    updates.full_name = `${newIme} ${newPriimek}`.trim()
  }
  if (data.telefon !== undefined) updates.phone = data.telefon || null
  if (data.lokacija !== undefined) updates.location_city = data.lokacija || null

  const { error } = await supabaseAdmin.from('profiles').update(updates).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/stranke/${id}`)
  return { success: true }
}

export async function deletePartner(id: string) {
  await ensureAdminAccess()
  await supabaseAdmin.from('obrtnik_profiles').delete().eq('id', id)
  revalidatePath('/admin/partnerji')
}

export async function updatePartner(
  id: string,
  data: { business_name?: string; telefon?: string; lokacija?: string; subscription_tier?: string }
): Promise<{ success: boolean; error?: string }> {
  await ensureAdminAccess()
  const obrtnikUpdates: Record<string, string | null> = {}
  if (data.business_name !== undefined) obrtnikUpdates.business_name = data.business_name || null
  if (data.subscription_tier !== undefined) obrtnikUpdates.subscription_tier = data.subscription_tier || null

  const profileUpdates: Record<string, string | null> = {}
  if (data.telefon !== undefined) profileUpdates.phone = data.telefon || null
  if (data.lokacija !== undefined) profileUpdates.location_city = data.lokacija || null

  if (Object.keys(obrtnikUpdates).length) {
    const { error } = await supabaseAdmin.from('obrtnik_profiles').update(obrtnikUpdates).eq('id', id)
    if (error) return { success: false, error: error.message }
  }
  if (Object.keys(profileUpdates).length) {
    const { error } = await supabaseAdmin.from('profiles').update(profileUpdates).eq('id', id)
    if (error) return { success: false, error: error.message }
  }
  revalidatePath(`/admin/partnerji/${id}`)
  return { success: true }
}

export async function getAdminPovprasevanjeDetail(id: string) {
  await ensureAdminAccess()
  const { data: row } = await supabaseAdmin
    .from('povprasevanja')
    .select('id, title, description, status, location_city, narocnik_id, category_id, urgency, budget_min, budget_max, preferred_date_from, preferred_date_to, assigned_to, admin_opomba')
    .eq('id', id)
    .single()
  if (!row) return null

  const [{ data: narocnik }, { data: category }, { data: obrtniki }] = await Promise.all([
    row.narocnik_id
      ? supabaseAdmin.from('profiles').select('full_name, email, phone').eq('id', row.narocnik_id).single()
      : Promise.resolve({ data: null }),
    row.category_id
      ? supabaseAdmin.from('categories').select('name').eq('id', row.category_id).single()
      : Promise.resolve({ data: null }),
    supabaseAdmin.from('obrtnik_profiles').select('id, business_name').eq('is_verified', true).order('business_name'),
  ])

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    location_city: row.location_city,
    category_id: row.category_id,
    category_name: (category as any)?.name || '—',
    urgency: row.urgency,
    budget_min: row.budget_min,
    budget_max: row.budget_max,
    preferred_date_from: row.preferred_date_from,
    preferred_date_to: row.preferred_date_to,
    assigned_to: row.assigned_to,
    admin_opomba: row.admin_opomba || '',
    narocnik_id: row.narocnik_id,
    narocnik_ime: (narocnik as any)?.full_name || '—',
    narocnik_email: (narocnik as any)?.email || '—',
    narocnik_telefon: (narocnik as any)?.phone || '',
    obrtniki: (obrtniki || []) as { id: string; business_name: string }[],
  }
}

export async function updatePovprasevanjeAdmin(
  id: string,
  data: {
    status?: string
    assigned_to?: string | null
    urgency?: string
    budget_min?: number | null
    budget_max?: number | null
    preferred_date_from?: string | null
    preferred_date_to?: string | null
    admin_opomba?: string
  }
): Promise<{ success: boolean; error?: string }> {
  await ensureAdminAccess()
  const updates: Record<string, any> = {}
  if (data.status !== undefined) updates.status = data.status
  if (data.assigned_to !== undefined) updates.obrtnik_id = data.assigned_to || null
  if (data.urgency !== undefined) updates.urgency = data.urgency
  if (data.budget_min !== undefined) updates.budget_min = data.budget_min
  if (data.budget_max !== undefined) updates.budget_max = data.budget_max
  if (data.preferred_date_from !== undefined) updates.preferred_date_from = data.preferred_date_from || null
  if (data.preferred_date_to !== undefined) updates.preferred_date_to = data.preferred_date_to || null
  if (data.admin_opomba !== undefined) updates.admin_opomba = data.admin_opomba

  const { error } = await supabaseAdmin.from('povprasevanja').update(updates).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/povprasevanja/${id}`)
  revalidatePath('/admin/povprasevanja')
  return { success: true }
}

export async function reaktivirajPartnerja(id: string) {
  await ensureAdminAccess()
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
  lokacija?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const email = data.email.trim().toLowerCase()
    const ime = data.ime.trim()
    const priimek = data.priimek.trim()
    const fullName = `${ime} ${priimek}`.trim()

    if (!email || !ime) {
      return { success: false, error: 'Ime in e-mail sta obvezna.' }
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { first_name: ime, last_name: priimek },
    })
    if (authError) return { success: false, error: authError.message }

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      email,
      full_name: fullName,
      phone: data.telefon || null,
      location_city: data.lokacija?.trim() || null,
      role: 'narocnik',
    })
    if (profileError) return { success: false, error: profileError.message }

    revalidatePath('/admin/stranke')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Napaka pri dodajanju stranke' }
  }
}

export async function getAdminInquiryFormOptions() {
  await ensureAdminAccess()
  const [{ data: categories }, { data: customers }] = await Promise.all([
    supabaseAdmin
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'narocnik')
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  return {
    categories: categories || [],
    customers: customers || [],
  }
}

export async function dodajPovprasevanjeAdmin(data: {
  narocnik_id: string
  category_id: string
  title: string
  description: string
  location_city: string
  location_region?: string
  urgency?: 'normalno' | 'kmalu' | 'nujno'
  budget_min?: number
  budget_max?: number
  preferred_date_from?: string
  preferred_date_to?: string
}) {
  await ensureAdminAccess()
  try {
    const title = data.title.trim()
    const description = data.description.trim()
    const locationCity = data.location_city.trim()

    if (!data.narocnik_id || !data.category_id || !title || !description || !locationCity) {
      return { success: false, error: 'Izpolnite vsa obvezna polja.' }
    }

    if (data.budget_min && data.budget_max && data.budget_min > data.budget_max) {
      return { success: false, error: 'Minimalni budget ne sme biti večji od maksimalnega.' }
    }

    const { error } = await supabaseAdmin
      .from('povprasevanja')
      .insert({
        narocnik_id: data.narocnik_id,
        category_id: data.category_id,
        title,
        description,
        location_city: locationCity,
        location_region: data.location_region?.trim() || null,
        urgency: data.urgency || 'normalno',
        budget_min: data.budget_min || null,
        budget_max: data.budget_max || null,
        preferred_date_from: data.preferred_date_from || null,
        preferred_date_to: data.preferred_date_to || null,
        status: 'odprto',
      })

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/povprasevanja')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Napaka pri dodajanju povpraševanja' }
  }
}

export async function dodajPartnerja(data: {
  email: string
  business_name: string
  ime?: string
  priimek?: string
  telefon?: string
  lokacija?: string
  category_id?: string
  verifyNow?: boolean
  subscription_tier?: 'start' | 'pro' | 'elite'
  payment_confirmed?: boolean
}): Promise<{ success: boolean; error?: string }> {
  try {
    const businessName = data.business_name.trim()
    const email = data.email.trim().toLowerCase()
    const fullName = [data.ime?.trim(), data.priimek?.trim()].filter(Boolean).join(' ').trim()
    const shouldVerify = Boolean(data.verifyNow)
    const subscriptionTier = data.subscription_tier || 'start'
    const paymentConfirmed = Boolean(data.payment_confirmed)

    if (!businessName || !email) {
      return { success: false, error: 'E-mail in ime podjetja sta obvezna.' }
    }

    if (subscriptionTier !== 'start' && !paymentConfirmed) {
      return { success: false, error: 'PRO/ELITE paket lahko dodelite samo po potrjenem plačilu.' }
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { business_name: data.business_name },
    })
    if (authError) return { success: false, error: authError.message }

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      email,
      full_name: fullName || businessName,
      phone: data.telefon || null,
      role: 'obrtnik',
      location_city: data.lokacija?.trim() || null,
    })
    if (profileError) return { success: false, error: profileError.message }

    const { error: obrtnikError } = await supabaseAdmin.from('obrtnik_profiles').upsert({
      id: authData.user.id,
      business_name: businessName,
      is_verified: shouldVerify,
      verification_status: shouldVerify ? 'verified' : 'pending',
      is_available: shouldVerify,
      subscription_tier: subscriptionTier,
      avg_rating: 0,
      total_reviews: 0,
    })
    if (obrtnikError) return { success: false, error: obrtnikError.message }

    if (data.category_id) {
      const { error: categoryError } = await supabaseAdmin
        .from('obrtnik_categories')
        .upsert({
          obrtnik_id: authData.user.id,
          category_id: data.category_id,
        })

      if (categoryError) return { success: false, error: categoryError.message }
    }

    revalidatePath('/admin/partnerji')
    revalidatePath('/mojstri')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Napaka pri dodajanju partnerja' }
  }
}

export async function getAktivneKategorije() {
  await ensureAdminAccess()
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) return []
  return data || []
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

export async function getStrankaActivity(userId: string) {
  await ensureAdminAccess()

  const [inquiriesRes, offersRes, paymentsRes] = await Promise.all([
    supabaseAdmin
      .from('povprasevanja')
      .select('id, title, status, created_at')
      .eq('narocnik_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('ponudbe')
      .select('id, povprasevanje_id, status, cena, created_at')
      .eq('narocnik_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('payment')
      .select('id, amount, status, created_at')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return {
    inquiries: inquiriesRes.data || [],
    offers: offersRes.data || [],
    payments: paymentsRes.data || [],
  }
}
