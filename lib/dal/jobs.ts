// Data Access Layer - Jobs (Povprasevanja)
import { createClient } from '@/lib/supabase/server'
import type { 
  Povprasevanje,
  Ponudba
} from '@/types/marketplace'

/**
 * Get povprasevanje by ID with full relations (for public job detail page)
 */
export async function getPublicPovprasevanjeDetail(id: string): Promise<Povprasevanje | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('povprasevanja')
    .select(`
      *,
      narocnik:profiles!povprasevanja_narocnik_id_fkey(*),
      category:categories(*),
      ponudbe(
        *,
        obrtnik:obrtnik_profiles(
          *,
          profile:profiles(*)
        )
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error fetching job detail:', error)
    return null
  }

  if (!data) {
    return null
  }

  return data as unknown as Povprasevanje
}

/**
 * Get all ponudbe for a povprasevanje
 */
export async function getJobOffers(povprasevanjeId: string): Promise<Ponudba[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ponudbe')
    .select(`
      *,
      obrtnik:obrtnik_profiles(
        *,
        profile:profiles(*)
      ),
      povprasevanje:povprasevanja(*),
      ocena:ocene(*)
    `)
    .eq('povprasevanje_id', povprasevanjeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[v0] Error fetching job offers:', error)
    return []
  }

  return (data || []) as unknown as Ponudba[]
}

/**
 * Get timeline events for a job
 */
export async function getJobTimeline(povprasevanjeId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('povprasevanja')
    .select('id, status, created_at, updated_at')
    .eq('id', povprasevanjeId)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error fetching job timeline:', error)
    return null
  }

  if (!data) {
    return null
  }

  // Build timeline from status and timestamps
  const timeline: { step: string; status: 'completed' | 'in_progress' | 'pending'; date: string; icon: string }[] = [
    {
      step: 'Zahtevek ustvarjen',
      status: 'completed',
      date: data.created_at,
      icon: 'CheckCircle2',
    },
  ]

  // Add status-based events
  const statusMap: Record<string, { step: string; icon: string }> = {
    'v_teku': { step: 'Prejeti ponudbe', icon: 'Mail' },
    'zakljuceno': { step: 'Delo zaključeno', icon: 'CheckCircle2' },
    'preklicano': { step: 'Zahtevek preklican', icon: 'X' },
  }

  if (data.status in statusMap) {
    timeline.push({
      step: statusMap[data.status].step,
      status: data.status === 'zakljuceno' ? 'completed' : 'in_progress',
      date: data.updated_at,
      icon: statusMap[data.status].icon,
    })
  }

  return timeline
}

/**
 * Count offers for a job
 */
export async function countJobOffers(povprasevanjeId: string): Promise<number> {
  const supabase = await createClient()
  
  const { count, error } = await supabase
    .from('ponudbe')
    .select('*', { count: 'exact', head: true })
    .eq('povprasevanje_id', povprasevanjeId)

  if (error) {
    console.error('[v0] Error counting offers:', error)
    return 0
  }

  return count || 0
}

/**
 * Get recent jobs for a category
 */
export async function getRecentJobsByCategory(
  categoryId: string,
  limit: number = 10
): Promise<Povprasevanje[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('povprasevanja')
    .select(`
      *,
      category:categories(*),
      narocnik:profiles!povprasevanja_narocnik_id_fkey(*)
    `)
    .eq('category_id', categoryId)
    .eq('status', 'odprto')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[v0] Error fetching recent jobs by category:', error)
    return []
  }

  return (data || []) as unknown as Povprasevanje[]
}
