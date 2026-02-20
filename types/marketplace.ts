// LiftGO Marketplace Types

export type UserRole = 'narocnik' | 'obrtnik'

export type UrgencyLevel = 'normalno' | 'kmalu' | 'nujno'

export type PovprasevanjeStatus = 'odprto' | 'v_teku' | 'zakljuceno' | 'preklicano'

export type PonudbaStatus = 'poslana' | 'sprejeta' | 'zavrnjena'

export type PriceType = 'fiksna' | 'ocena' | 'po_ogledu'

export type VerificationStatus = 'pending' | 'verified' | 'rejected'

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  phone?: string
  avatar_url?: string
  location_city?: string
  location_region?: string
  email?: string
  first_name?: string
  last_name?: string
  created_at: string
}

export interface ObrtnikProfile {
  id: string
  business_name: string
  description?: string
  ajpes_id?: string
  is_verified: boolean
  verification_status: VerificationStatus
  avg_rating: number
  total_reviews: number
  response_time_hours?: number
  is_available: boolean
  created_at: string
  profile?: Profile
  categories?: Category[]
}

export interface Category {
  id: string
  name: string
  slug: string
  icon_name?: string
  description?: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Povprasevanje {
  id: string
  narocnik_id: string
  category_id: string
  title: string
  description: string
  location_city: string
  location_region?: string
  location_notes?: string
  urgency: UrgencyLevel
  preferred_date_from?: string
  preferred_date_to?: string
  budget_min?: number
  budget_max?: number
  status: PovprasevanjeStatus
  created_at: string
  updated_at: string
  narocnik?: Profile
  category?: Category
  ponudbe?: Ponudba[]
  ponudbe_count?: number
}

export interface Ponudba {
  id: string
  povprasevanje_id: string
  obrtnik_id: string
  message: string
  price_estimate?: number
  price_type: PriceType
  available_date?: string
  status: PonudbaStatus
  created_at: string
  povprasevanje?: Povprasevanje
  obrtnik?: ObrtnikProfile
  ocena?: Ocena
}

export interface Ocena {
  id: string
  ponudba_id: string
  narocnik_id: string
  obrtnik_id: string
  rating: number
  comment?: string
  is_public: boolean
  created_at: string
  narocnik?: Profile
  obrtnik?: ObrtnikProfile
  ponudba?: Ponudba
}

// Database Inserts (without id, timestamps)
export interface ProfileInsert {
  id: string
  role: UserRole
  full_name: string
  phone?: string
  avatar_url?: string
  location_city?: string
  location_region?: string
  email?: string
}

export interface ObrtnikProfileInsert {
  id: string
  business_name: string
  description?: string
  ajpes_id?: string
}

export interface PovprasevanjeInsert {
  narocnik_id: string
  category_id: string
  title: string
  description: string
  location_city: string
  location_region?: string
  location_notes?: string
  urgency?: UrgencyLevel
  preferred_date_from?: string
  preferred_date_to?: string
  budget_min?: number
  budget_max?: number
}

export interface PonudbaInsert {
  povprasevanje_id: string
  obrtnik_id: string
  message: string
  price_estimate?: number
  price_type: PriceType
  available_date?: string
}

export interface OcenaInsert {
  ponudba_id: string
  narocnik_id: string
  obrtnik_id: string
  rating: number
  comment?: string
  is_public?: boolean
}

// Database Updates
export interface ProfileUpdate {
  role?: UserRole
  full_name?: string
  phone?: string
  avatar_url?: string
  location_city?: string
  location_region?: string
}

export interface ObrtnikProfileUpdate {
  business_name?: string
  description?: string
  ajpes_id?: string
  is_available?: boolean
  response_time_hours?: number
}

export interface PovprasevanjeUpdate {
  title?: string
  description?: string
  location_city?: string
  location_region?: string
  location_notes?: string
  urgency?: UrgencyLevel
  preferred_date_from?: string
  preferred_date_to?: string
  budget_min?: number
  budget_max?: number
  status?: PovprasevanjeStatus
}

export interface PonudbaUpdate {
  message?: string
  price_estimate?: number
  price_type?: PriceType
  available_date?: string
  status?: PonudbaStatus
}

// Filter types for queries
export interface PovprasevanjeFilters {
  category_id?: string
  location_city?: string
  urgency?: UrgencyLevel
  status?: PovprasevanjeStatus
  budget_max?: number
}

export interface ObrtnikFilters {
  category_id?: string
  location_city?: string
  min_rating?: number
  is_verified?: boolean
  is_available?: boolean
}
