export {
  type ServiceAreaRow,
  type ServiceAreaDisplay,
  type ServiceAreaFormData,
  type ServiceAreaInput,
  SERVICE_AREA_DEFAULTS,
  toServiceAreaDisplay,
  toServiceAreaDisplayList,
} from './service-areas'

// Availability type for obrtnik_availability table
export type AvailabilityRow = {
  id: string
  obrtnik_id: string
  day_of_week: number
  time_from: string | null
  time_to: string | null
  is_available: boolean
  created_at: string
}

// Portfolio item type for portfolio_items table
export type PortfolioItemDisplay = {
  id: string
  obrtnik_id: string
  title: string
  description: string | null
  category: string | null
  completed_at: string | null
  duration_days: number | null
  price_approx: number | null
  location_city: string | null
  image_urls: string[]
  is_featured: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// Review type for ocene table
export type ReviewDisplay = {
  id: string
  ponudba_id: string
  narocnik_id: string
  obrtnik_id: string
  rating: number
  quality_rating: number | null
  punctuality_rating: number | null
  price_rating: number | null
  comment: string | null
  photos: string[] | null
  obrtnik_reply: string | null
  replied_at: string | null
  is_public: boolean
  created_at: string
  profiles?: {
    first_name: string | null
    last_name: string | null
  } | null
}

// Obrtnik profile display type
export type ObrtnikProfileDisplay = {
  id: string
  business_name: string
  description: string | null
  ajpes_id: string | null
  is_verified: boolean
  verification_status: 'pending' | 'verified' | 'rejected'
  avg_rating: number
  total_reviews: number
  response_time_hours: number | null
  is_available: boolean
  created_at: string
  subscription_tier: 'start' | 'pro' | null
  stripe_customer_id: string | null
  stripe_account_id: string | null
  tagline: string | null
  hourly_rate: number | null
  years_experience: number | null
  working_since: string | null
  website_url: string | null
  facebook_url: string | null
  instagram_url: string | null
  certificate_urls: string[] | null
  service_radius_km: number | null
  obrtnik_categories?: Array<{
    categories: {
      name: string
      slug?: string
      icon_name?: string | null
    } | null
  }>
}
