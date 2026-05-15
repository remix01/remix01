// Data Access Layer - Povprasevanja
import { createClient } from '@/lib/supabase/server'
import { sendPushToObrtnikiByCategory } from '@/lib/push-notifications'
import { enqueue } from '@/lib/jobs/queue'
import { getOrCreateCategory } from '@/lib/dal/categories'
import type { 
  Povprasevanje, 
  PovprasevanjeInsert, 
  PovprasevanjeUpdate,
  PovprasevanjeFilters 
} from '@/types/marketplace'
import { toCanonicalLeadStatus, toLegacyInquiryStatus } from '@/lib/lead-status'


function mapInquiryStatus<T extends { status?: string | null }>(item: T): T {
  return {
    ...item,
    status: toCanonicalLeadStatus(item.status),
  }
}

/**
 * Get povprasevanje by ID with relations
 */
export async function getPovprasevanje(id: string): Promise<Povprasevanje | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('povprasevanja')
    .select(`
      *,
      narocnik:profiles!povprasevanja_narocnik_id_fkey(*),
      category:categories(*),
      ponudbe(
        id,
        status
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error fetching povprasevanje:', error)
    return null
  }

  // Add ponudbe count
  const result = {
    ...data!,
    ponudbe_count: (data as any).ponudbe?.length || 0
  }

  // Keep legacy status shape here until narocnik detail view is fully migrated
  return result as unknown as Povprasevanje
}

/**
 * List povprasevanja with filters
 */
export async function listPovprasevanja(filters?: PovprasevanjeFilters & {
  limit?: number
  offset?: number
}): Promise<Povprasevanje[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('povprasevanja')
    .select(`
      *,
      narocnik:profiles!povprasevanja_narocnik_id_fkey(*),
      category:categories(*),
      ponudbe(id, status)
    `)

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id)
  }

  if (filters?.location_city) {
    query = query.eq('location_city', filters.location_city)
  }

  if (filters?.urgency) {
    query = query.eq('urgency', filters.urgency)
  }

  if (filters?.status) {
    query = query.eq('status', toLegacyInquiryStatus(filters.status))
  }

  if (filters?.budget_max) {
    query = query.lte('budget_max', filters.budget_max)
  }

  query = query.order('created_at', { ascending: false })

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('[v0] Error listing povprasevanja:', error)
    return []
  }

  // Add ponudbe counts
  const results = data.map((item: any) => mapInquiryStatus({
    ...item,
    ponudbe_count: item.ponudbe?.length || 0
  }))

  return results as unknown as Povprasevanje[]
}

/**
 * Get povprasevanja for naročnik
 */
export async function getNarocnikPovprasevanja(narocnikId: string, limit?: number): Promise<Povprasevanje[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('povprasevanja')
    .select(`
      *,
      category:categories(*),
      ponudbe(id, status)
    `)
    .eq('narocnik_id', narocnikId)
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('[v0] Error fetching narocnik povprasevanja:', error)
    return []
  }

  const results = data.map((item: any) => mapInquiryStatus({
    ...item,
    ponudbe_count: item.ponudbe?.length || 0
  }))

  return results as unknown as Povprasevanje[]
}

/**
 * Get open povprasevanja for obrtnik to browse
 */
export async function getOpenPovprasevanjaForObrtnik(
  obrtnikId: string,
  categoryIds?: string[],
  limit?: number
): Promise<Povprasevanje[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('povprasevanja')
    .select(`
      *,
      narocnik:profiles!povprasevanja_narocnik_id_fkey(*),
      category:categories(*),
      ponudbe(id, status, obrtnik_id)
    `)
    .eq('status', toLegacyInquiryStatus('new'))

  if (categoryIds && categoryIds.length > 0) {
    query = query.in('category_id', categoryIds)
  }

  query = query.order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('[v0] Error fetching open povprasevanja:', error)
    return []
  }

  // Filter out povprasevanja where obrtnik already submitted a ponudba
  const filtered = data.filter((item: any) => {
    const hasSubmitted = item.ponudbe?.some((p: any) => p.obrtnik_id === obrtnikId)
    return !hasSubmitted
  })

  const results = filtered.map((item: any) => mapInquiryStatus({
    ...item,
    ponudbe_count: item.ponudbe?.length || 0
  }))

  return results as unknown as Povprasevanje[]
}

/**
 * Create povprasevanje with optional auto-creation of category
 * 
 * Supports two flows:
 * 1. Pass category_id directly (existing flow)
 * 2. Pass categoryName to auto-create category if it doesn't exist
 */
export async function createPovprasevanje(
  povprasevanje: PovprasevanjeInsert,
  options?: {
    categoryName?: string
    userId?: string
    ipAddress?: string
  }
): Promise<Povprasevanje | null> {
  let categoryId = povprasevanje.category_id

  // Auto-create category if categoryName provided and no category_id
  if (options?.categoryName && !categoryId) {
    try {
      categoryId = await getOrCreateCategory(
        options.categoryName,
        options.userId,
        options.ipAddress
      )
    } catch (error) {
      console.error('[v0] Error creating/finding category:', error)
      throw error
    }
  }

  const supabase = await createClient()
  
  // ⭐ KRITIČNO: pridobi narocnik_id iz seje, če ni posredovan
  let narocnikId = povprasevanje.narocnik_id
  if (!narocnikId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    narocnikId = user.id
  }
  
  // Gradimo insertData z obveznimi polji
  const insertData = {
    narocnik_id: narocnikId,
    title: povprasevanje.title,
    description: povprasevanje.description,
    location_city: povprasevanje.location_city,
    category_id: categoryId || null,
    location_region: povprasevanje.location_region || null,
    location_notes: povprasevanje.location_notes || null,
    urgency: povprasevanje.urgency || null,
    preferred_date_from: povprasevanje.preferred_date_from || null,
    preferred_date_to: povprasevanje.preferred_date_to || null,
    budget_min: povprasevanje.budget_min || null,
    budget_max: povprasevanje.budget_max || null,
    attachment_urls: povprasevanje.attachment_urls || null,
    status: toLegacyInquiryStatus('new'),
  }

  const { data, error } = await supabase
    .from('povprasevanja')
    .insert(insertData as any)
    .select(`
      *,
      narocnik:profiles!povprasevanja_narocnik_id_fkey(*),
      category:categories(*)
    `)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error creating povprasevanje:', error)
    return null
  }

  const result = data as unknown as Povprasevanje

  // Pošlji push obvestila (obstoječa koda)
  if (result.category_id && result.title && result.location_city) {
    try {
      await sendPushToObrtnikiByCategory({
        categoryId: result.category_id,
        title: 'Novo povpraševanje v vaši kategoriji',
        message: `${result.title} — ${result.location_city}`,
        link: '/obrtnik/povprasevanja'
      })
    } catch (pushError) {
      console.error('[v0] Error sending push to obrtniki:', pushError)
    }
  }

  // Pošlji email potrditev (obstoječa koda)
  if (result.narocnik_id) {
    try {
      await enqueue('sendEmail', {
        jobType: 'povprasevanje_confirmation',
        povprasevanjeId: result.id,
        narocnikId: result.narocnik_id,
        title: result.title,
        category: result.category?.name,
        location: result.location_city,
        urgency: result.urgency,
        budget: result.budget_max,
      })
    } catch (emailError) {
      console.error('[v0] Error enqueueing confirmation email:', emailError)
    }
  }

  return result
}

/**
 * Update povprasevanje
 */
export async function updatePovprasevanje(id: string, updates: PovprasevanjeUpdate): Promise<Povprasevanje | null> {
  const supabase = await createClient()
  
  const payload = { ...updates } as any
  if (payload.status) payload.status = toLegacyInquiryStatus(payload.status)

  const { data, error } = await supabase
    .from('povprasevanja')
    .update(payload)
    .eq('id', id)
    .select(`
      *,
      narocnik:profiles!povprasevanja_narocnik_id_fkey(*),
      category:categories(*)
    `)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error updating povprasevanje:', error)
    return null
  }

  return mapInquiryStatus(data as any) as unknown as Povprasevanje
}

/**
 * Delete povprasevanje (only if no ponudbe exist)
 */
export async function deletePovprasevanje(id: string): Promise<boolean> {
  const supabase = await createClient()
  
  // Check if there are any ponudbe
  const { data: ponudbe } = await supabase
    .from('ponudbe')
    .select('id')
    .eq('povprasevanje_id', id)
    .limit(1)

  if (ponudbe && ponudbe.length > 0) {
    console.error('[v0] Cannot delete povprasevanje with existing ponudbe')
    return false
  }

  const { error } = await supabase
    .from('povprasevanja')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[v0] Error deleting povprasevanje:', error)
    return false
  }

  return true
}

/**
 * Cancel povprasevanje (soft delete by status change)
 */
export async function cancelPovprasevanje(id: string): Promise<boolean> {
  const result = await updatePovprasevanje(id, { status: 'cancelled' })
  return result !== null
}

/**
 * Count povprasevanja by status for a naročnik
 */
export async function countNarocnikPovprasevanjaByStatus(narocnikId: string): Promise<Record<string, number>> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('povprasevanja')
    .select('status')
    .eq('narocnik_id', narocnikId)

  if (error) {
    console.error('[v0] Error counting povprasevanja:', error)
    return {}
  }

  const counts: Record<string, number> = {}
  data.forEach((item: any) => {
    const canonical = toCanonicalLeadStatus(item.status)
    counts[canonical] = (counts[canonical] || 0) + 1
  })

  return counts
}
