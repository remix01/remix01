// Data Access Layer - Reviews (Ocene)
import { createClient } from '@/lib/supabase/server'
import type { Ocena } from '@/types/marketplace'

/**
 * Get reviews for an obrtnik
 */
export async function getObrtnikReviews(
  obrtnikId: string,
  limit: number = 10
): Promise<Ocena[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ocene')
    .select(`
      *,
      narocnik:profiles(*),
      ponudba:ponudbe(*)
    `)
    .eq('obrtnik_id', obrtnikId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[v0] Error fetching obrtnik reviews:', error)
    return []
  }

  return (data || []) as unknown as Ocena[]
}

/**
 * Get review statistics for an obrtnik
 */
export async function getObrtnikReviewStats(obrtnikId: string): Promise<{
  average: number
  total: number
  distribution: Record<number, number>
}> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ocene')
    .select('rating')
    .eq('obrtnik_id', obrtnikId)
    .eq('is_public', true)

  if (error) {
    console.error('[v0] Error fetching review stats:', error)
    return { average: 0, total: 0, distribution: {} }
  }

  if (!data || data.length === 0) {
    return { average: 0, total: 0, distribution: {} }
  }

  // Calculate stats
  const ratings = data.map((r: any) => r.rating)
  const sum = ratings.reduce((acc: number, r: number) => acc + r, 0)
  const average = sum / ratings.length

  // Distribution
  const distribution: Record<number, number> = {}
  for (let i = 1; i <= 5; i++) {
    distribution[i] = ratings.filter((r: number) => r === i).length
  }

  return {
    average: Number(average.toFixed(2)),
    total: data.length,
    distribution,
  }
}

/**
 * Get average rating for an obrtnik
 */
export async function getObrtnikAverageRating(obrtnikId: string): Promise<number> {
  const stats = await getObrtnikReviewStats(obrtnikId)
  return stats.average
}

/**
 * Count total reviews for an obrtnik
 */
export async function countObrtnikReviews(obrtnikId: string): Promise<number> {
  const supabase = await createClient()
  
  const { count, error } = await supabase
    .from('ocene')
    .select('*', { count: 'exact', head: true })
    .eq('obrtnik_id', obrtnikId)
    .eq('is_public', true)

  if (error) {
    console.error('[v0] Error counting reviews:', error)
    return 0
  }

  return count || 0
}
