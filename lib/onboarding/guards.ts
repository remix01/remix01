import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ENABLE_ONBOARDING_GUARDS = process.env.ENABLE_ONBOARDING_GUARDS === 'true'

export type OnboardingGuardState = 'completed' | 'incomplete' | 'pending' | 'rejected' | 'payout_incomplete'

export class OnboardingGuardError extends Error {
  constructor(
    public readonly state: OnboardingGuardState,
    public readonly redirectTo: string,
    message?: string,
  ) {
    super(message ?? `Access denied due to onboarding state: ${state}`)
    this.name = 'OnboardingGuardError'
  }
}

type ProviderRow = {
  business_name: string | null
  description: string | null
  verification_status: 'pending' | 'verified' | 'rejected' | null
  is_verified: boolean | null
  stripe_account_id: string | null
  stripe_onboarded: boolean | null
}

function isBlank(value: string | null | undefined): boolean {
  return (value ?? '').trim().length === 0
}

function evaluateProviderState(provider: ProviderRow | null): OnboardingGuardState {
  if (!provider || isBlank(provider.business_name) || isBlank(provider.description)) return 'incomplete'
  if (provider.verification_status === 'rejected') return 'rejected'
  if (!provider.is_verified || (provider.verification_status ?? 'pending') === 'pending') return 'pending'
  if (!provider.stripe_account_id || !provider.stripe_onboarded) return 'payout_incomplete'
  return 'completed'
}

function providerRedirectFor(state: OnboardingGuardState): string {
  switch (state) {
    case 'incomplete':
      return '/registracija-mojster'
    case 'pending':
      return '/partner-dashboard?screen=waiting-verification'
    case 'rejected':
      return '/partner-dashboard/account?screen=remediation'
    case 'payout_incomplete':
      return '/dashboard/stripe-return?onboarding=required'
    default:
      return '/partner-dashboard'
  }
}

function buyerRedirectFor(state: OnboardingGuardState): string {
  switch (state) {
    case 'incomplete':
      return '/registracija'
    case 'pending':
      return '/dashboard?screen=waiting'
    case 'rejected':
      return '/dashboard?screen=remediation'
    case 'payout_incomplete':
      return '/dashboard/stripe-return?onboarding=required'
    default:
      return '/dashboard'
  }
}

export async function assertCanAccessProviderDashboard(userId: string): Promise<void> {
  if (!ENABLE_ONBOARDING_GUARDS) return

  const { data: provider } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('business_name, description, verification_status, is_verified, stripe_account_id, stripe_onboarded')
    .eq('id', userId)
    .maybeSingle<ProviderRow>()

  const state = evaluateProviderState(provider)
  if (state !== 'completed') {
    throw new OnboardingGuardError(state, providerRedirectFor(state))
  }
}

export async function assertCanAccessBuyerDashboard(userId: string): Promise<void> {
  if (!ENABLE_ONBOARDING_GUARDS) return

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle<{ role: string | null }>()

  const state: OnboardingGuardState = profile?.role ? 'completed' : 'incomplete'
  if (state !== 'completed') {
    throw new OnboardingGuardError(state, buyerRedirectFor(state))
  }
}

export function redirectForOnboardingGuard(error: unknown): never {
  if (error instanceof OnboardingGuardError) {
    redirect(error.redirectTo)
  }
  throw error
}
