// Data Access Layer - Povprasevanja
import { createClient } from '@/lib/supabase/server'
import { sendPushToObrtnikiByCategory } from '@/lib/push-notifications'
import type { 
  Povprasevanje, 
  PovprasevanjeInsert, 
  PovprasevanjeUpdate,
  PovprasevanjeFilters 
} from '@/types/marketplace'

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
    ...data,
    ponudbe_count: data.ponudbe?.length || 0
  }

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
    query = query.eq('status', filters.status)
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
  const results = data.map(item => ({
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

  const results = data.map(item => ({
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
    .eq('status', 'odprto')

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
  const filtered = data.filter(item => {
    const hasSubmitted = item.ponudbe?.some((p: any) => p.obrtnik_id === obrtnikId)
    return !hasSubmitted
  })

  const results = filtered.map(item => ({
    ...item,
    ponudbe_count: item.ponudbe?.length || 0
  }))

  return results as unknown as Povprasevanje[]
}

/**
 * Create povprasevanje
 */
export async function createPovprasevanje(povprasevanje: PovprasevanjeInsert): Promise<Povprasevanje | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('povprasevanja')
    .insert(povprasevanje)
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

  // Send push notification to obrtniki in the category
  if (result.category_id && result.title && result.location_city) {
    try {
      await sendPushToObrtnikiByCategory({
        categoryId: result.category_id,
        title: 'Novo povpraševanje v vaši kategoriji',
        message: `${result.title} — ${result.location_city}`,
        link: '/obrtnik/povprasevanja'
      })
    } catch (pushError) {
      // Don't fail the main operation if push fails
      console.error('[v0] Error sending push to obrtniki:', pushError)
    }
  }

  return result
}

/**
 * Update povprasevanje
 */
export async function updatePovprasevanje(id: string, updates: PovprasevanjeUpdate): Promise<Povprasevanje | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('povprasevanja')
    .update(updates)
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

  return data as unknown as Povprasevanje
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
  const result = await updatePovprasevanje(id, { status: 'preklicano' })
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
    counts[item.status] = (counts[item.status] || 0) + 1
  })

  return counts
}
