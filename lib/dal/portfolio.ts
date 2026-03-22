// Data Access Layer - Portfolio
import { createClient } from '@/lib/supabase/server'

export interface PortfolioImage {
  id: string
  obrtnik_id: string
  url: string
  title?: string
  description?: string
  created_at: string
}

/**
 * Get portfolio images for an obrtnik
 */
export async function getObrtnikPortfolio(obrtnikId: string): Promise<PortfolioImage[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('obrtnik_portfolio' as any)
    .select('*')
    .eq('obrtnik_id', obrtnikId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[v0] Error fetching portfolio:', error)
    return []
  }

  return (data || []) as unknown as PortfolioImage[]
}

/**
 * Check if portfolio table exists and has data
 * This is a helper to determine if we should show the gallery
 */
export async function hasPortfolioImages(obrtnikId: string): Promise<boolean> {
  const images = await getObrtnikPortfolio(obrtnikId)
  return images.length > 0
}

/**
 * Get featured portfolio image (first image)
 */
export async function getFeaturedPortfolioImage(obrtnikId: string): Promise<PortfolioImage | null> {
  const images = await getObrtnikPortfolio(obrtnikId)
  return images.length > 0 ? images[0] : null
}
