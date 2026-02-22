// Data Access Layer - Ponudbe & Ocene
import { createClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/notifications'
import type { 
  Ponudba, 
  PonudbaInsert, 
  PonudbaUpdate,
  Ocena,
  OcenaInsert
} from '@/types/marketplace'

/**
 * Get ponudba by ID with relations
 */
export async function getPonudba(id: string): Promise<Ponudba | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ponudbe')
    .select(`
      *,
      povprasevanje:povprasevanja(*),
      obrtnik:obrtnik_profiles(
        *,
        profile:profiles(*)
      ),
      ocena:ocene(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('[v0] Error fetching ponudba:', error)
    return null
  }

  return data as unknown as Ponudba
}

/**
 * Get ponudbe for a povprasevanje
 */
export async function getPonudbeForPovprasevanje(povprasevanjeId: string): Promise<Ponudba[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ponudbe')
    .select(`
      *,
      obrtnik:obrtnik_profiles(
        *,
        profile:profiles(*)
      ),
      ocena:ocene(*)
    `)
    .eq('povprasevanje_id', povprasevanjeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[v0] Error fetching ponudbe:', error)
    return []
  }

  return data as unknown as Ponudba[]
}

/**
 * Get ponudbe submitted by an obrtnik
 */
export async function getObrtnikPonudbe(obrtnikId: string, limit?: number): Promise<Ponudba[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('ponudbe')
    .select(`
      *,
      povprasevanje:povprasevanja(
        *,
        narocnik:profiles!povprasevanja_narocnik_id_fkey(*)
      ),
      ocena:ocene(*)
    `)
    .eq('obrtnik_id', obrtnikId)
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('[v0] Error fetching obrtnik ponudbe:', error)
    return []
  }

  return data as unknown as Ponudba[]
}

/**
 * Create ponudba
 */
export async function createPonudba(ponudba: PonudbaInsert): Promise<Ponudba | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ponudbe')
    .insert(ponudba)
    .select(`
      *,
      povprasevanje:povprasevanja(*),
      obrtnik:obrtnik_profiles(
        *,
        profile:profiles(*)
      )
    `)
    .single()

  if (error) {
    console.error('[v0] Error creating ponudba:', error)
    return null
  }

  const result = data as unknown as Ponudba

  // Send notification to naročnik about new ponudba
  if (result.povprasevanje?.narocnik_id && result.obrtnik?.profile?.full_name) {
    await sendNotification({
      userId: result.povprasevanje.narocnik_id,
      type: 'nova_ponudba',
      title: 'Nova ponudba prejeta',
      message: `${result.obrtnik.profile.full_name} je poslal ponudbo za vaše povpraševanje.`,
      link: `/narocnik/povprasevanja/${result.povprasevanje.id}`,
      metadata: { ponudbaId: result.id, obrtknikId: result.obrtnik_id }
    }).catch(err => {
      console.error('[v0] Error sending notification:', err)
      // Don't fail the whole operation if notification fails
    })
  }

  return result
}

/**
 * Update ponudba
 */
export async function updatePonudba(id: string, updates: PonudbaUpdate): Promise<Ponudba | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ponudbe')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      povprasevanje:povprasevanja(*),
      obrtnik:obrtnik_profiles(
        *,
        profile:profiles(*)
      )
    `)
    .single()

  if (error) {
    console.error('[v0] Error updating ponudba:', error)
    return null
  }

  return data as unknown as Ponudba
}

/**
 * Accept ponudba (changes status to sprejeta)
 */
export async function acceptPonudba(id: string): Promise<boolean> {
  const result = await updatePonudba(id, { status: 'sprejeta' })
  
  // Send notification to obrtnik that their ponudba was accepted
  if (result) {
    const ponudba = await getPonudba(id)
    if (ponudba?.obrtnik_id && ponudba?.povprasevanje?.title) {
      await sendNotification({
        userId: ponudba.obrtnik_id,
        type: 'ponudba_sprejeta',
        title: 'Ponudba sprejeta! 🎉',
        message: `Vaša ponudba je bila sprejeta. Dogovorite se za termin z naročnikom.`,
        link: '/obrtnik/ponudbe',
        metadata: { ponudbaId: id, povprasevanjeId: ponudba.povprasevanje.id }
      }).catch(err => {
        console.error('[v0] Error sending notification:', err)
      })
    }
  }
  
  return result !== null
}

/**
 * Reject ponudba (changes status to zavrnjena)
 */
export async function rejectPonudba(id: string): Promise<boolean> {
  const result = await updatePonudba(id, { status: 'zavrnjena' })
  return result !== null
}

/**
 * Count ponudbe by status for an obrtnik
 */
export async function countObrtnikPonudbeByStatus(obrtnikId: string): Promise<Record<string, number>> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ponudbe')
    .select('status')
    .eq('obrtnik_id', obrtnikId)

  if (error) {
    console.error('[v0] Error counting ponudbe:', error)
    return {}
  }

  const counts: Record<string, number> = {}
  data.forEach((item: any) => {
    counts[item.status] = (counts[item.status] || 0) + 1
  })

  return counts
}

// ============================================================================
// OCENE (Reviews)
// ============================================================================

/**
 * Get ocena by ponudba ID
 */
export async function getOcenaByPonudba(ponudbaId: string): Promise<Ocena | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ocene')
    .select(`
      *,
      narocnik:profiles!ocene_narocnik_id_fkey(*),
      obrtnik:obrtnik_profiles(*)
    `)
    .eq('ponudba_id', ponudbaId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No ocena found
      return null
    }
    console.error('[v0] Error fetching ocena:', error)
    return null
  }

  return data as unknown as Ocena
}

/**
 * Get ocene for an obrtnik
 */
export async function getObrtnikOcene(obrtnikId: string, limit?: number): Promise<Ocena[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('ocene')
    .select(`
      *,
      narocnik:profiles!ocene_narocnik_id_fkey(*),
      ponudba:ponudbe(
        povprasevanje:povprasevanja(*)
      )
    `)
    .eq('obrtnik_id', obrtnikId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('[v0] Error fetching obrtnik ocene:', error)
    return []
  }

  return data as unknown as Ocena[]
}

/**
 * Create ocena
 */
export async function createOcena(ocena: OcenaInsert): Promise<Ocena | null> {
  const supabase = await createClient()
  
  // Check if ocena already exists for this ponudba
  const existing = await getOcenaByPonudba(ocena.ponudba_id)
  if (existing) {
    console.error('[v0] Ocena already exists for this ponudba')
    return null
  }

  const { data, error } = await supabase
    .from('ocene')
    .insert(ocena)
    .select(`
      *,
      narocnik:profiles!ocene_narocnik_id_fkey(*),
      obrtnik:obrtnik_profiles(*)
    `)
    .single()

  if (error) {
    console.error('[v0] Error creating ocena:', error)
    return null
  }

  const result = data as unknown as Ocena

  // Send notification to obrtnik about new review
  if (result.obrtnik_id && ocena.rating) {
    await sendNotification({
      userId: result.obrtnik_id,
      type: 'nova_ocena',
      title: 'Prejeli ste novo oceno',
      message: `Naročnik vas je ocenil z ${ocena.rating}/5 zvezdicami.`,
      link: '/obrtnik/ocene',
      metadata: { ocenaId: result.id, ponudbaId: result.ponudba_id, rating: ocena.rating }
    }).catch(err => {
      console.error('[v0] Error sending notification:', err)
    })
  }

  return result
}

/**
 * Update ocena visibility
 */
export async function updateOcenaVisibility(ocenaId: string, isPublic: boolean): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('ocene')
    .update({ is_public: isPublic })
    .eq('id', ocenaId)

  if (error) {
    console.error('[v0] Error updating ocena visibility:', error)
    return false
  }

  return true
}

/**
 * Get average rating for obrtnik
 */
export async function getObrtnikAverageRating(obrtnikId: string): Promise<{ avg_rating: number; total_reviews: number }> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('obrtnik_profiles')
    .select('avg_rating, total_reviews')
    .eq('id', obrtnikId)
    .single()

  if (error) {
    console.error('[v0] Error fetching obrtnik rating:', error)
    return { avg_rating: 0, total_reviews: 0 }
  }

  return {
    avg_rating: data.avg_rating || 0,
    total_reviews: data.total_reviews || 0
  }
}
