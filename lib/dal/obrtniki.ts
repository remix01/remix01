// Data Access Layer - Obrtniki (Contractors)
import { createClient } from '@/lib/supabase/server'

export interface ObrtnikiFilter {
  specialnosti?: string[]
  lokacije?: string[]
  minRating?: number
  status?: 'pending' | 'verified' | 'blocked'
  search?: string
  limit?: number
  offset?: number
}

export interface ObrtnikiPublic {
  id: string
  ime: string
  priimek: string
  podjetje?: string
  specialnosti: string[]
  lokacije: string[]
  ocena: number
  stevilo_ocen: number
  profilna_slika_url?: string
  bio?: string
  leta_izkusenj?: number
  created_at: string
}

/**
 * Get all verified obrtniki for public catalog with filters
 */
export async function listVerifiedObrtniki(
  filters?: ObrtnikiFilter
): Promise<ObrtnikiPublic[]> {
  const supabase = await createClient()

  let query = supabase
    .from('obrtniki')
    .select(
      `id, ime, priimek, podjetje, specialnosti, lokacije, ocena, 
       stevilo_ocen, profilna_slika_url, bio, leta_izkusenj, created_at`
    )
    .eq('status', 'verified')
    .order('ocena', { ascending: false })

  // Location filter
  if (filters?.lokacije && filters.lokacije.length > 0) {
    query = query.overlaps('lokacije', filters.lokacije)
  }

  // Specialnosti filter
  if (filters?.specialnosti && filters.specialnosti.length > 0) {
    query = query.overlaps('specialnosti', filters.specialnosti)
  }

  // Rating filter
  if (filters?.minRating) {
    query = query.gte('ocena', filters.minRating)
  }

  // Search by name/company
  if (filters?.search) {
    const searchTerm = `%${filters.search}%`
    query = query.or(
      `ime.ilike.${searchTerm},priimek.ilike.${searchTerm},podjetje.ilike.${searchTerm}`
    )
  }

  // Pagination
  const offset = filters?.offset || 0
  const limit = Math.min(filters?.limit || 20, 100)
  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query

  if (error) {
    console.error('Error fetching obrtniki:', error)
    return []
  }

  return data || []
}

/**
 * Get single obrtnik by ID
 */
export async function getObrtnikiById(id: string): Promise<ObrtnikiPublic | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('obrtniki')
    .select(
      `id, ime, priimek, podjetje, specialnosti, lokacije, ocena, 
       stevilo_ocen, profilna_slika_url, bio, leta_izkusenj, created_at`
    )
    .eq('id', id)
    .eq('status', 'verified')
    .single()

  if (error) {
    console.error('Error fetching obrtnik:', error)
    return null
  }

  return data
}

/**
 * Get obrtnik's povprasevanja (inquiries/jobs)
 */
export async function getObrtnikiPovprasevanja(obrtnikiId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('povprasevanja')
    .select('*')
    .eq('obrtnik_id', obrtnikiId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching povprasevanja:', error)
    return []
  }

  return data || []
}

/**
 * Get unique specialnosti for filtering
 */
export async function getActiveSpecialnosti(): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('obrtniki')
    .select('specialnosti')
    .eq('status', 'verified')

  if (error) {
    console.error('Error fetching specialnosti:', error)
    return []
  }

  // Flatten and deduplicate
  const specialnosti = new Set<string>()
  data?.forEach((row) => {
    if (row.specialnosti && Array.isArray(row.specialnosti)) {
      row.specialnosti.forEach((s: string) => specialnosti.add(s))
    }
  })

  return Array.from(specialnosti).sort()
}

/**
 * Get unique lokacije for filtering
 */
export async function getActiveLokacije(): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('obrtniki')
    .select('lokacije')
    .eq('status', 'verified')

  if (error) {
    console.error('Error fetching lokacije:', error)
    return []
  }

  // Flatten and deduplicate
  const lokacije = new Set<string>()
  data?.forEach((row) => {
    if (row.lokacije && Array.isArray(row.lokacije)) {
      row.lokacije.forEach((l: string) => lokacije.add(l))
    }
  })

  return Array.from(lokacije).sort()
}
