// ============================================
// LIFTGO — Glavni tipi
// ============================================

export type UserRole = 'narocnik' | 'obrtnik'
export type UrgencyLevel = 'normalno' | 'kmalu' | 'nujno'
export type PovprasevanjeStatus = 
  | 'odprto' 
  | 'v_teku' 
  | 'zakljuceno' 
  | 'preklicano'
export type PonudbaStatus = 'poslana' | 'sprejeta' | 'zavrnjena'
export type PriceType = 'fiksna' | 'ocena' | 'po_ogledu'
export type VerificationStatus = 'pending' | 'verified' | 'rejected'
export type ObrtnikStatus = 'pending' | 'verified' | 'blocked'
export type PaketTip = 'start' | 'pro'

// ── Profile (naročnik ALI obrtnik) ──────────
export interface Profile {
  id: string
  role: UserRole
  full_name: string
  first_name?: string
  last_name?: string
  phone?: string
  avatar_url?: string
  location_city?: string
  location_region?: string
  email?: string
  created_at: string
  updated_at?: string
}

// ── Obrtnik razširjen profil ─────────────────
export interface ObrtnikProfile {
  id: string                          // = profile.id
  business_name: string
  description?: string
  ajpes_id?: string
  ajpes_verified_at?: string
  is_verified: boolean
  verification_status: VerificationStatus
  status: ObrtnikStatus
  avg_rating: number
  total_reviews: number
  response_time_hours?: number
  is_available: boolean
  stripe_account_id?: string
  stripe_onboarded?: boolean
  years_experience?: number
  price_min?: number
  price_max?: number
  paket?: PaketTip
  created_at: string
  // Relations
  profile?: Profile
  categories?: Category[]
}

// ── Kategorije ───────────────────────────────
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

// ── Povpraševanje (naročnik odda) ────────────
export interface Povprasevanje {
  id: string
  narocnik_id: string              // references profiles.id
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
  // Relations
  narocnik?: Profile
  category?: Category
  ponudbe?: Ponudba[]
  ponudbe_count?: number
}

// ── Ponudba (obrtnik pošlje) ─────────────────
export interface Ponudba {
  id: string
  povprasevanje_id: string
  obrtnik_id: string               // references profiles.id
  message: string
  price_estimate?: number
  price_type: PriceType
  available_date?: string
  status: PonudbaStatus
  stripe_payment_intent_id?: string
  payment_status?: 'unpaid' | 'pending' | 'paid' | 'failed'
  created_at: string
  // Relations
  povprasevanje?: Povprasevanje
  obrtnik?: ObrtnikProfile
  ocena?: Ocena
}

// ── Ocena (naročnik oceni po zaključku) ──────
export interface Ocena {
  id: string
  ponudba_id: string
  narocnik_id: string              // references profiles.id
  obrtnik_id: string               // references obrtnik_profiles.id
  rating: number                   // 1-5
  comment?: string
  is_public: boolean
  created_at: string
  // Relations
  narocnik?: Profile
  obrtnik?: ObrtnikProfile
  ponudba?: Ponudba
}

// ── Notifikacije ─────────────────────────────
export type NotificationType =
  | 'nova_ponudba'
  | 'ponudba_sprejeta'
  | 'ponudba_zavrnjena'
  | 'nova_ocena'
  | 'termin_potrjen'
  | 'termin_opomnik'
  | 'placilo_prejeto'
  | 'placilo_zahtevano'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link?: string
  is_read: boolean
  metadata?: Record<string, unknown>
  created_at: string
}

// ── Admin ─────────────────────────────────────
export interface AdminUser {
  id: string
  user_id: string
  ime: string
  email: string
  vloga: 'admin' | 'superadmin'
  aktiven: boolean
  created_at: string
}

export interface AdminStats {
  skupajNarocnikov: number
  skupajObrtnikov: number
  skupajPovprasevanj: number
  novaPovprasevanja: number
  cakajoceVerifikacije: number
  zakljucenaDela: number
  rastNarocnikov: number
  rastObrtnikov: number
}

// ── Escrow ────────────────────────────────────
export type EscrowStatus =
  | 'pending'
  | 'paid'
  | 'releasing'
  | 'resolving'
  | 'released'
  | 'disputed'
  | 'refunded'
  | 'cancelled'

export interface EscrowTransaction {
  id: string
  inquiry_id?: string
  partner_id?: string
  customer_email: string
  amount_total_cents: number
  commission_rate: number
  commission_cents: number
  payout_cents: number
  stripe_payment_intent_id?: string
  stripe_transfer_id?: string
  stripe_refund_id?: string
  status: EscrowStatus
  paid_at?: string
  released_at?: string
  refunded_at?: string
  release_due_at?: string
  description?: string
  created_at: string
  updated_at: string
}

// ── Insert/Update tipi ────────────────────────
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

// ── Filter tipi ───────────────────────────────
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

export interface ChartData {
  mesec: string
  vrednost: number
}
