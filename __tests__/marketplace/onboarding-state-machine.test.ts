import {
  assertValidTransition,
  canTransition,
  computeProviderState,
  isDashboardAllowedForState,
} from '@/lib/onboarding/state-machine'

describe('onboarding state machine', () => {
  test('allowed buyer transitions', () => {
    expect(canTransition('buyer_registered', 'buyer_profile_incomplete')).toBe(true)
    expect(canTransition('buyer_profile_incomplete', 'buyer_ready')).toBe(true)
  })

  test('allowed provider transitions', () => {
    expect(canTransition('provider_pending_admin_review', 'provider_admin_approved_pending_payout')).toBe(true)
    expect(canTransition('provider_payout_incomplete', 'provider_ready')).toBe(true)
  })

  test('forbidden transitions', () => {
    expect(canTransition('provider_registered', 'provider_ready')).toBe(false)
    expect(() => assertValidTransition('provider_registered', 'provider_ready')).toThrow(
      'Invalid onboarding transition: provider_registered -> provider_ready'
    )
  })

  test('provider not ready without Stripe', () => {
    const state = computeProviderState(
      { full_name: 'Janez Novak', location_city: 'Ljubljana', email_verified: true, terms_accepted: true },
      { business_name: 'Novak d.o.o.', admin_approved: true, stripe_account_id: null }
    )

    expect(state).toBe('provider_payout_incomplete')
  })

  test('rejected provider cannot become ready directly', () => {
    expect(canTransition('provider_admin_rejected', 'provider_ready')).toBe(false)
  })

  test('suspended user cannot access dashboards', () => {
    expect(isDashboardAllowedForState('buyer_suspended', 'buyer')).toBe(false)
    expect(isDashboardAllowedForState('provider_suspended', 'provider')).toBe(false)
  })
})
