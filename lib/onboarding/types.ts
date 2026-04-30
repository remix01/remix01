export type OnboardingRole = 'buyer' | 'provider'

export type BuyerOnboardingState =
  | 'buyer_registered'
  | 'buyer_profile_incomplete'
  | 'buyer_ready'
  | 'buyer_suspended'

export type ProviderOnboardingState =
  | 'provider_registered'
  | 'provider_profile_incomplete'
  | 'provider_pending_admin_review'
  | 'provider_admin_rejected'
  | 'provider_admin_approved_pending_payout'
  | 'provider_payout_incomplete'
  | 'provider_ready'
  | 'provider_suspended'

export type OnboardingState = BuyerOnboardingState | ProviderOnboardingState

export type BlockedReason =
  | 'missing_profile_fields'
  | 'email_unverified'
  | 'terms_not_accepted'
  | 'admin_review_required'
  | 'admin_rejected'
  | 'stripe_account_missing'
  | 'stripe_requirements_due'
  | 'stripe_restricted'
  | 'manual_suspension'

export type DashboardType = 'buyer' | 'provider'

export interface ProfileLike {
  role?: string | null
  full_name?: string | null
  phone?: string | null
  location_city?: string | null
  email_verified?: boolean | null
  terms_accepted?: boolean | null
  is_suspended?: boolean | null
}

export interface ProviderProfileLike {
  business_name?: string | null
  is_verified?: boolean | null
  verification_status?: string | null
  verification_reviewed?: boolean | null
  admin_approved?: boolean | null
  admin_rejected?: boolean | null
  stripe_account_id?: string | null
  stripe_onboarding_complete?: boolean | null
  stripe_onboarded?: boolean | null
  is_suspended?: boolean | null
}

export interface StripeStatusLike {
  hasAccount?: boolean
  isComplete?: boolean
  needsInfo?: boolean
  restrictionReason?: string | null
  currentlyDue?: string[]
}
