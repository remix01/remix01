import type {
  BlockedReason,
  BuyerOnboardingState,
  DashboardType,
  OnboardingRole,
  OnboardingState,
  ProfileLike,
  ProviderOnboardingState,
  ProviderProfileLike,
  StripeStatusLike,
} from './types'

const BUYER_TRANSITIONS: Record<BuyerOnboardingState, BuyerOnboardingState[]> = {
  buyer_registered: ['buyer_profile_incomplete', 'buyer_ready', 'buyer_suspended'],
  buyer_profile_incomplete: ['buyer_ready', 'buyer_suspended'],
  buyer_ready: ['buyer_profile_incomplete', 'buyer_suspended'],
  buyer_suspended: [],
}

const PROVIDER_TRANSITIONS: Record<ProviderOnboardingState, ProviderOnboardingState[]> = {
  provider_registered: ['provider_profile_incomplete', 'provider_pending_admin_review', 'provider_suspended'],
  provider_profile_incomplete: ['provider_pending_admin_review', 'provider_suspended'],
  provider_pending_admin_review: [
    'provider_admin_rejected',
    'provider_admin_approved_pending_payout',
    'provider_suspended',
  ],
  provider_admin_rejected: ['provider_profile_incomplete', 'provider_suspended'],
  provider_admin_approved_pending_payout: ['provider_payout_incomplete', 'provider_ready', 'provider_suspended'],
  provider_payout_incomplete: ['provider_ready', 'provider_suspended'],
  provider_ready: ['provider_payout_incomplete', 'provider_suspended'],
  provider_suspended: [],
}

export function getInitialOnboardingState(role: OnboardingRole): OnboardingState {
  return role === 'buyer' ? 'buyer_registered' : 'provider_registered'
}

export function getAllowedTransitions(state: OnboardingState): OnboardingState[] {
  if (state.startsWith('buyer_')) {
    return BUYER_TRANSITIONS[state as BuyerOnboardingState]
  }
  return PROVIDER_TRANSITIONS[state as ProviderOnboardingState]
}

export function canTransition(fromState: OnboardingState, toState: OnboardingState): boolean {
  return getAllowedTransitions(fromState).includes(toState)
}

export function assertValidTransition(fromState: OnboardingState, toState: OnboardingState): void {
  if (!canTransition(fromState, toState)) {
    throw new Error(`Invalid onboarding transition: ${fromState} -> ${toState}`)
  }
}

export function computeBuyerState(profile: ProfileLike): BuyerOnboardingState {
  if (profile.is_suspended) return 'buyer_suspended'

  const missingProfile = !profile.full_name || !profile.location_city
  if (missingProfile) return 'buyer_profile_incomplete'

  const emailVerified = profile.email_verified !== false
  const termsAccepted = profile.terms_accepted !== false
  if (!emailVerified || !termsAccepted) return 'buyer_profile_incomplete'

  return 'buyer_ready'
}

export function computeProviderState(
  profile: ProfileLike,
  providerProfile: ProviderProfileLike,
  stripeStatus?: StripeStatusLike
): ProviderOnboardingState {
  if (profile.is_suspended || providerProfile.is_suspended) return 'provider_suspended'

  const missingBaseProfile =
    !profile.full_name ||
    !profile.location_city ||
    !providerProfile.business_name

  const emailVerified = profile.email_verified !== false
  const termsAccepted = profile.terms_accepted !== false

  if (missingBaseProfile || !emailVerified || !termsAccepted) {
    return 'provider_profile_incomplete'
  }

  if (providerProfile.admin_rejected || providerProfile.verification_status === 'rejected') {
    return 'provider_admin_rejected'
  }

  const approved =
    providerProfile.admin_approved === true ||
    providerProfile.is_verified === true ||
    providerProfile.verification_status === 'verified'

  if (!approved) {
    return 'provider_pending_admin_review'
  }

  if (!providerProfile.stripe_account_id) {
    return 'provider_payout_incomplete'
  }

  if (!stripeStatus) return 'provider_admin_approved_pending_payout'

  if (!stripeStatus.hasAccount || !providerProfile.stripe_account_id) {
    return 'provider_payout_incomplete'
  }

  if (stripeStatus.restrictionReason) {
    return 'provider_payout_incomplete'
  }

  if (stripeStatus.needsInfo || (stripeStatus.currentlyDue?.length ?? 0) > 0) {
    return 'provider_payout_incomplete'
  }

  const providerStripeComplete =
    providerProfile.stripe_onboarding_complete === true || providerProfile.stripe_onboarded === true

  if (stripeStatus.isComplete && providerStripeComplete) {
    return 'provider_ready'
  }

  return 'provider_payout_incomplete'
}

export function getBlockedReasons(
  profile: ProfileLike,
  providerProfile?: ProviderProfileLike,
  stripeStatus?: StripeStatusLike
): BlockedReason[] {
  const reasons = new Set<BlockedReason>()

  if (profile.is_suspended || providerProfile?.is_suspended) reasons.add('manual_suspension')
  if (!profile.full_name || !profile.location_city) reasons.add('missing_profile_fields')
  if (profile.email_verified === false) reasons.add('email_unverified')
  if (profile.terms_accepted === false) reasons.add('terms_not_accepted')

  if (providerProfile) {
    if (!providerProfile.business_name) reasons.add('missing_profile_fields')

    const rejected = providerProfile.admin_rejected || providerProfile.verification_status === 'rejected'
    const approved =
      providerProfile.admin_approved === true ||
      providerProfile.is_verified === true ||
      providerProfile.verification_status === 'verified'

    if (rejected) reasons.add('admin_rejected')
    if (!approved && !rejected) reasons.add('admin_review_required')

    if (!stripeStatus?.hasAccount || !providerProfile.stripe_account_id) {
      reasons.add('stripe_account_missing')
    }

    if (stripeStatus?.restrictionReason) reasons.add('stripe_restricted')
    if (stripeStatus?.needsInfo || (stripeStatus?.currentlyDue?.length ?? 0) > 0) {
      reasons.add('stripe_requirements_due')
    }
  }

  return Array.from(reasons)
}

export function isDashboardAllowedForState(
  state: OnboardingState,
  dashboardType: DashboardType
): boolean {
  if (dashboardType === 'buyer') return state === 'buyer_ready'
  return state === 'provider_ready'
}
