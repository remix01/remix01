import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  OnboardingStatus,
  ONBOARDING_TRANSITIONS,
  ONBOARDING_TERMINAL,
} from '@/lib/state-machine/statuses'
import { assertTransitionValid, TransitionError } from '@/lib/state-machine/transition'
import { eventBus } from '@/lib/events'

type OnboardingState = OnboardingStatus

type ProviderSnapshot = {
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

  let state: OnboardingState = OnboardingStatus.PROFILE_INCOMPLETE
  if (!snapshot.role) state = OnboardingStatus.SUSPENDED
  else if (snapshot.role === 'narocnik') state = OnboardingStatus.ACTIVE
  else if (!snapshot.obrtnikProfileExists) state = OnboardingStatus.PROFILE_INCOMPLETE
  else if (snapshot.verificationStatus === 'rejected') state = OnboardingStatus.REJECTED
  else if (snapshot.isVerified && !!snapshot.stripeAccountId && snapshot.stripeOnboarded) state = OnboardingStatus.ACTIVE
  else if (snapshot.isVerified && (!snapshot.stripeAccountId || !snapshot.stripeOnboarded)) state = OnboardingStatus.PAYOUT_SETUP_REQUIRED
  else if (!snapshot.isVerified && (snapshot.verificationStatus ?? 'pending') === 'pending') state = OnboardingStatus.VERIFICATION_PENDING

  return { state, blockedReasons }
}

export function assertOnboardingTransitionValid(
  currentState: OnboardingState,
  targetState: OnboardingState,
): void {
  assertTransitionValid(currentState, targetState, ONBOARDING_TRANSITIONS, ONBOARDING_TERMINAL)
}

async function loadSnapshot(userId: string): Promise<ProviderSnapshot> {
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

  // Load previous state to validate transition
  const { data: existing } = await supabaseAdmin
    .from('onboarding_state')
    .select('state')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing?.state && existing.state !== derivedState) {
    try {
      assertOnboardingTransitionValid(existing.state as OnboardingState, derivedState)
    } catch (err) {
      if (err instanceof TransitionError) {
        console.warn(`[ONBOARDING] Rejected transition for ${userId}: ${existing.state} → ${derivedState} (${err.reason})`)
        throw err
      }
      throw err
    }
  }

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

  if (existing?.state && existing.state !== derivedState) {
    eventBus.emit('onboarding.transitioned', {
      userId,
      fromState: existing.state,
      toState: derivedState,
      blockedReasons,
      transitionedAt: new Date().toISOString(),
    })
  }

  return { state: derivedState, blockedReasons }
}
