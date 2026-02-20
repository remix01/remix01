// LiftGO Marketplace Types
// Generated from Supabase schema

export type UserRole = 'narocnik' | 'obrtnik'

export type PovprasevanjeStatus = 'odprto' | 'v_teku' | 'zakljuceno' | 'preklicano'

export type PonudbaStatus = 'poslana' | 'sprejeta' | 'zavrnjena'

export type Urgency = 'normalno' | 'kmalu' | 'nujno'

export type PriceType = 'fiksna' | 'okvirna' | 'po_dogovoru'

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  phone: string | null
  avatar_url: string | null
  location_city: string | null
  location_region: string | null
  created_at: string
  updated_at: string
}

export interface ObrnikProfile {
  user_id: string
  business_name: string
  description: string | null
  is_verified: boolean
  avg_rating: number
  total_reviews: number
  is_available: boolean
  verification_status: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  created_at: string
}

export interface ObrnikCategory {
  obrtnik_id: string
  category_id: string
  created_at: string
}

export interface Povprasevanje {
  id: string
  narocnik_id: string
  category_id: string
  title: string
  description: string
  location_city: string
  location_region: string | null
  location_notes: string | null
  urgency: Urgency
  preferred_date_from: string | null
  preferred_date_to: string | null
  budget_min: number | null
  budget_max: number | null
  status: PovprasevanjeStatus
  created_at: string
  updated_at: string
}

export interface PovprasevanjeWithRelations extends Povprasevanje {
  category: Category
  narocnik: Profile
  ponudbe?: Ponudba[]
}

export interface Ponudba {
  id: string
  povprasevanje_id: string
  obrtnik_id: string
  message: string
  price_estimate: number | null
  price_type: PriceType
  available_date: string | null
  status: PonudbaStatus
  created_at: string
  updated_at: string
}

export interface PonudbaWithRelations extends Ponudba {
  obrtnik: Profile & { obrtnik_profile: ObrnikProfile }
  povprasevanje?: PovprasevanjeWithRelations
}

export interface Ocena {
  id: string
  ponudba_id: string
  narocnik_id: string
  obrtnik_id: string
  rating: number
  comment: string | null
  is_public: boolean
  created_at: string
}

export interface OcenaWithRelations extends Ocena {
  narocnik: Profile
  obrtnik: Profile & { obrtnik_profile: ObrnikProfile }
}

// Form types for creating/updating entities
export interface CreateProfileInput {
  role: UserRole
  full_name: string
  phone?: string
  location_city?: string
  location_region?: string
}

export interface UpdateProfileInput {
  full_name?: string
  phone?: string
  avatar_url?: string
  location_city?: string
  location_region?: string
}

export interface CreateObrnikProfileInput {
  business_name: string
  description?: string
}

export interface UpdateObrnikProfileInput {
  business_name?: string
  description?: string
  is_available?: boolean
}

export interface CreatePovprasevanjeInput {
  category_id: string
  title: string
  description: string
  location_city: string
  location_region?: string
  location_notes?: string
  urgency: Urgency
  preferred_date_from?: string
  preferred_date_to?: string
  budget_min?: number
  budget_max?: number
}

export interface UpdatePovprasevanjeInput {
  title?: string
  description?: string
  location_city?: string
  location_region?: string
  location_notes?: string
  urgency?: Urgency
  preferred_date_from?: string
  preferred_date_to?: string
  budget_min?: number
  budget_max?: number
  status?: PovprasevanjeStatus
}

export interface CreatePonudbaInput {
  povprasevanje_id: string
  message: string
  price_estimate?: number
  price_type: PriceType
  available_date?: string
}

export interface CreateOcenaInput {
  ponudba_id: string
  obrtnik_id: string
  rating: number
  comment?: string
  is_public?: boolean
}

// Filter types
export interface ObrtnikiFilters {
  category_id?: string
  location_city?: string
  is_available?: boolean
  min_rating?: number
}

export interface PovprasevanjaFilters {
  status?: PovprasevanjeStatus
  category_id?: string
  urgency?: Urgency
}
