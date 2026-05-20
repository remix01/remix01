import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  OnboardingStatus,
  ONBOARDING_TRANSITIONS,
  ONBOARDING_TERMINAL,
} from '@/lib/state-machine/statuses'
import { assertTransitionValid, TransitionError } from '@/lib/state-machine/transition'
import { eventBus } from '@/lib/events'

type OnboardingState = OnboardingStatus

const LEGACY_ONBOARDING_MAP: Record<string, OnboardingStatus> = {
  completed: OnboardingStatus.ACTIVE,
  blocked: OnboardingStatus.SUSPENDED,
  profile_incomplete: OnboardingStatus.PROFILE_INCOMPLETE,
  verification_pending: OnboardingStatus.VERIFICATION_PENDING,
  payout_setup_required: OnboardingStatus.PAYOUT_SETUP_REQUIRED,
  draft: OnboardingStatus.DRAFT,
  registered: OnboardingStatus.REGISTERED,
  email_verified: OnboardingStatus.EMAIL_VERIFIED,
  profile_completed: OnboardingStatus.PROFILE_COMPLETED,
  payment_connected: OnboardingStatus.PAYMENT_CONNECTED,
  active: OnboardingStatus.ACTIVE,
  rejected: OnboardingStatus.REJECTED,
  suspended: OnboardingStatus.SUSPENDED,
}

export function migrateOnboardingState(raw: string): OnboardingStatus {
  return LEGACY_ONBOARDING_MAP[raw] ?? (raw as OnboardingStatus)
}

export type ProviderSnapshot = {
  userId: string
  role: 'narocnik' | 'obrtnik' | null
  obrtnikProfileExists: boolean
  businessName: string | null
  description: string | null
  isVerified: boolean
  verificationStatus: 'pending' | 'verified' | 'rejected' | null
  stripeAccountId: string | null
  stripeOnboarded: boolean
}

function cleanText(value: string | null | undefined): string {
  return (value ?? '').trim()
}

const INITIAL_STATES: ReadonlySet<OnboardingStatus> = new Set([
  OnboardingStatus.DRAFT,
  OnboardingStatus.REGISTERED,
  OnboardingStatus.EMAIL_VERIFIED,
  OnboardingStatus.PROFILE_INCOMPLETE,
  OnboardingStatus.PROFILE_COMPLETED,
  OnboardingStatus.PAYMENT_CONNECTED,
  OnboardingStatus.VERIFICATION_PENDING,
  OnboardingStatus.PAYOUT_SETUP_REQUIRED,
  OnboardingStatus.ACTIVE,
  OnboardingStatus.SUSPENDED,
  OnboardingStatus.REJECTED,
])

export function deriveOnboardingState(snapshot: ProviderSnapshot): { state: OnboardingState; blockedReasons: string[] } {
  const blockedReasons: string[] = []

  if (!snapshot.role) blockedReasons.push('missing_role')
  if (snapshot.role === 'obrtnik' && !snapshot.obrtnikProfileExists) blockedReasons.push('missing_obrtnik_profile')
  if (snapshot.role === 'obrtnik' && cleanText(snapshot.businessName) === '') blockedReasons.push('missing_business_name')
  if (snapshot.role === 'obrtnik' && cleanText(snapshot.description) === '') blockedReasons.push('missing_description')
  if (snapshot.role === 'obrtnik' && snapshot.verificationStatus === 'rejected') blockedReasons.push('verification_rejected')
  if (snapshot.role === 'obrtnik' && !snapshot.isVerified && (snapshot.verificationStatus ?? 'pending') === 'pending') blockedReasons.push('verification_pending')
  if (snapshot.role === 'obrtnik' && !snapshot.stripeAccountId) blockedReasons.push('missing_stripe_account')
  if (snapshot.role === 'obrtnik' && !!snapshot.stripeAccountId && !snapshot.stripeOnboarded) blockedReasons.push('stripe_onboarding_incomplete')

  if (!snapshot.role) return { state: OnboardingStatus.SUSPENDED, blockedReasons }
  if (snapshot.role === 'narocnik') return { state: OnboardingStatus.ACTIVE, blockedReasons }
  if (!snapshot.obrtnikProfileExists) return { state: OnboardingStatus.DRAFT, blockedReasons }
  if (snapshot.verificationStatus === 'rejected') return { state: OnboardingStatus.REJECTED, blockedReasons }

  const hasCompletedProfile = cleanText(snapshot.businessName) !== '' && cleanText(snapshot.description) !== ''
  const isVerified = snapshot.isVerified || snapshot.verificationStatus === 'verified'

  if (!!snapshot.stripeAccountId && snapshot.stripeOnboarded) return { state: OnboardingStatus.ACTIVE, blockedReasons }
  if (!!snapshot.stripeAccountId) return { state: OnboardingStatus.PAYMENT_CONNECTED, blockedReasons }
  if (isVerified) return { state: OnboardingStatus.PAYOUT_SETUP_REQUIRED, blockedReasons }
  if (hasCompletedProfile) return { state: OnboardingStatus.PROFILE_COMPLETED, blockedReasons }
  if ((snapshot.verificationStatus ?? 'pending') === 'pending' && !snapshot.isVerified) {
    return { state: OnboardingStatus.VERIFICATION_PENDING, blockedReasons }
  }

  return { state: OnboardingStatus.REGISTERED, blockedReasons }
}

export function assertOnboardingTransitionValid(
  currentState: OnboardingState,
  targetState: OnboardingState,
): void {
  assertTransitionValid(currentState, targetState, ONBOARDING_TRANSITIONS, ONBOARDING_TERMINAL)
}

export async function loadSnapshot(userId: string): Promise<ProviderSnapshot> {
  const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('id, role').eq('id', userId).maybeSingle()
  if (profileError) throw profileError

  const { data: provider, error: providerError } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('id, business_name, description, is_verified, verification_status, stripe_account_id, stripe_onboarded')
    .eq('id', userId)
    .maybeSingle()
  if (providerError) throw providerError

  return {
    userId,
    role: (profile?.role ?? null) as ProviderSnapshot['role'],
    obrtnikProfileExists: !!provider,
    businessName: provider?.business_name ?? null,
    description: provider?.description ?? null,
    isVerified: provider?.is_verified ?? false,
    verificationStatus: (provider?.verification_status ?? null) as ProviderSnapshot['verificationStatus'],
    stripeAccountId: provider?.stripe_account_id ?? null,
    stripeOnboarded: provider?.stripe_onboarded ?? false,
  }
}

export async function transitionOnboardingState(userId: string): Promise<{ state: OnboardingState; blockedReasons: string[] }> {
  const snapshot = await loadSnapshot(userId)
  const { state: derivedState, blockedReasons } = deriveOnboardingState(snapshot)

  const { data: existing } = await supabaseAdmin
    .from('onboarding_state')
    .select('state')
    .eq('user_id', userId)
    .maybeSingle()

  const migratedPrevious = existing?.state ? migrateOnboardingState(existing.state) : null

  // Idempotent: no-op when the derived state matches what's already persisted
  if (migratedPrevious === derivedState) {
    return { state: derivedState, blockedReasons }
  }

  if (migratedPrevious) {
    try {
      assertOnboardingTransitionValid(migratedPrevious, derivedState)
    } catch (err) {
      if (err instanceof TransitionError) {
        console.warn(`[ONBOARDING] Rejected transition for ${userId}: ${migratedPrevious} (was: ${existing!.state}) → ${derivedState} (${err.reason})`)
        throw err
      }
      throw err
    }
  } else {
    // First-time insert: only allow states reachable as an initial state
    if (!INITIAL_STATES.has(derivedState)) {
      throw new TransitionError('(none)', derivedState, 'INVALID_TRANSITION')
    }
  }

  if (migratedPrevious) {
    const { data: updated, error } = await supabaseAdmin
      .from('onboarding_state')
      .update({
        state: derivedState,
        blocked_reasons: blockedReasons,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('state', existing!.state)
      .select('user_id')

    if (error) throw error

    if (!updated || updated.length === 0) {
      throw new Error(
        `[ONBOARDING] Concurrent modification for ${userId} — expected state '${existing!.state}'`
      )
    }
  } else {
    const { error } = await supabaseAdmin.from('onboarding_state').upsert(
      {
        user_id: userId,
        state: derivedState,
        blocked_reasons: blockedReasons,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) throw error
  }

  if (migratedPrevious && migratedPrevious !== derivedState) {
    eventBus.emit('onboarding.transitioned', {
      userId,
      fromState: migratedPrevious,
      toState: derivedState,
      blockedReasons,
      transitionedAt: new Date().toISOString(),
    })
  }

  return { state: derivedState, blockedReasons }
}
