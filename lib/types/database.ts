/**
 * Centralized database row types for LiftGO.
 * These reflect the actual nullable columns in Supabase.
 * Components should import from here instead of defining local interfaces.
 */

export interface PortfolioItem {
  id: string
  title: string
  description: string | null
  category: string | null
  completed_at: string | null
  duration_days?: number | null
  price_approx?: number | null
  location_city?: string | null
  image_urls: string[] | null
  is_featured: boolean | null
  /** Always normalized to a number before passing to components (null → 0) */
  sort_order: number
}

export interface AvailabilityScheduleRow {
  id: string
  day_of_week: number
  is_available: boolean | null
  time_from: string | null
  time_to: string | null
}
