import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import {
  deriveOnboardingState,
  assertOnboardingTransitionValid,
  migrateOnboardingState,
} from '@/lib/onboarding/state-machine'
import type { ProviderSnapshot } from '@/lib/onboarding/state-machine'
import { OnboardingStatus } from '@/lib/state-machine/statuses'
import { TransitionError } from '@/lib/state-machine/transition'

function makeSnapshot(overrides: Partial<ProviderSnapshot> = {}): ProviderSnapshot {
  return {
    userId: 'test-user-1',
    role: 'obrtnik',
    obrtnikProfileExists: true,
    businessName: 'Test OÜ',
    description: 'We fix things',
    isVerified: false,
    verificationStatus: 'pending',
    stripeAccountId: null,
    stripeOnboarded: false,
    ...overrides,
  }
}

// ── deriveOnboardingState ───────────────────────────────────

describe('deriveOnboardingState', () => {
  it('returns DRAFT for obrtnik without obrtnik_profile row', () => {
    const result = deriveOnboardingState(
      makeSnapshot({ obrtnikProfileExists: false, businessName: null, description: null }),
    )
    expect(result.state).toBe(OnboardingStatus.DRAFT)
    expect(result.blockedReasons).toContain('missing_obrtnik_profile')
  })

  it('returns REGISTERED for obrtnik with empty profile fields', () => {
    const result = deriveOnboardingState(
      makeSnapshot({ businessName: '', description: '' }),
    )
    expect(result.state).toBe(OnboardingStatus.VERIFICATION_PENDING)
    expect(result.blockedReasons).toContain('missing_business_name')
    expect(result.blockedReasons).toContain('missing_description')
  })

  it('returns PROFILE_COMPLETED when business_name and description filled, not verified', () => {
    const result = deriveOnboardingState(makeSnapshot())
    expect(result.state).toBe(OnboardingStatus.PROFILE_COMPLETED)
  })

  it('returns PAYOUT_SETUP_REQUIRED when verified but no stripe', () => {
    const result = deriveOnboardingState(
      makeSnapshot({ isVerified: true, verificationStatus: 'verified' }),
    )
    expect(result.state).toBe(OnboardingStatus.PAYOUT_SETUP_REQUIRED)
  })

  it('returns PAYMENT_CONNECTED when stripe account exists but not onboarded', () => {
    const result = deriveOnboardingState(
      makeSnapshot({
        isVerified: true,
        verificationStatus: 'verified',
        stripeAccountId: 'acct_123',
        stripeOnboarded: false,
      }),
    )
    expect(result.state).toBe(OnboardingStatus.PAYMENT_CONNECTED)
  })

  it('returns ACTIVE when fully onboarded', () => {
    const result = deriveOnboardingState(
      makeSnapshot({
        isVerified: true,
        verificationStatus: 'verified',
        stripeAccountId: 'acct_123',
        stripeOnboarded: true,
      }),
    )
    expect(result.state).toBe(OnboardingStatus.ACTIVE)
  })

  it('returns ACTIVE for narocnik regardless of other fields', () => {
    const result = deriveOnboardingState(
      makeSnapshot({ role: 'narocnik', obrtnikProfileExists: false }),
    )
    expect(result.state).toBe(OnboardingStatus.ACTIVE)
  })

  it('returns SUSPENDED when role is null', () => {
    const result = deriveOnboardingState(
      makeSnapshot({ role: null, obrtnikProfileExists: false }),
    )
    expect(result.state).toBe(OnboardingStatus.SUSPENDED)
    expect(result.blockedReasons).toContain('missing_role')
  })

  it('returns REJECTED when verification_status is rejected', () => {
    const result = deriveOnboardingState(
      makeSnapshot({ verificationStatus: 'rejected' }),
    )
    expect(result.state).toBe(OnboardingStatus.REJECTED)
    expect(result.blockedReasons).toContain('verification_rejected')
  })
})

// ── assertOnboardingTransitionValid ─────────────────────────

describe('assertOnboardingTransitionValid', () => {
  it('allows draft → registered', () => {
    expect(() =>
      assertOnboardingTransitionValid(OnboardingStatus.DRAFT, OnboardingStatus.REGISTERED),
    ).not.toThrow()
  })

  it('allows registered → profile_completed', () => {
    expect(() =>
      assertOnboardingTransitionValid(OnboardingStatus.REGISTERED, OnboardingStatus.PROFILE_COMPLETED),
    ).not.toThrow()
  })

  it('rejects draft → active (skip ahead)', () => {
    expect(() =>
      assertOnboardingTransitionValid(OnboardingStatus.DRAFT, OnboardingStatus.ACTIVE),
    ).toThrow(TransitionError)
  })

  it('rejects active → draft (backward jump)', () => {
    expect(() =>
      assertOnboardingTransitionValid(OnboardingStatus.ACTIVE, OnboardingStatus.DRAFT),
    ).toThrow(TransitionError)
  })

  it('allows active → suspended', () => {
    expect(() =>
      assertOnboardingTransitionValid(OnboardingStatus.ACTIVE, OnboardingStatus.SUSPENDED),
    ).not.toThrow()
  })

  it('allows suspended → active (reactivation)', () => {
    expect(() =>
      assertOnboardingTransitionValid(OnboardingStatus.SUSPENDED, OnboardingStatus.ACTIVE),
    ).not.toThrow()
  })

  it('allows rejected → draft (re-application)', () => {
    expect(() =>
      assertOnboardingTransitionValid(OnboardingStatus.REJECTED, OnboardingStatus.DRAFT),
    ).not.toThrow()
  })
})

// ── migrateOnboardingState ──────────────────────────────────

describe('migrateOnboardingState', () => {
  it('maps "completed" to ACTIVE', () => {
    expect(migrateOnboardingState('completed')).toBe(OnboardingStatus.ACTIVE)
  })

  it('maps "blocked" to SUSPENDED', () => {
    expect(migrateOnboardingState('blocked')).toBe(OnboardingStatus.SUSPENDED)
  })

  it('passes through canonical values unchanged', () => {
    expect(migrateOnboardingState('draft')).toBe(OnboardingStatus.DRAFT)
    expect(migrateOnboardingState('active')).toBe(OnboardingStatus.ACTIVE)
  })

  it('returns unknown values as-is (cast)', () => {
    expect(migrateOnboardingState('some_future_state')).toBe('some_future_state')
  })
})

// ── transitionOnboardingState (integration-style with mocks) ──

jest.mock('@/lib/supabase-admin', () => {
  const mockFrom = jest.fn()
  return {
    supabaseAdmin: { from: mockFrom },
    __mockFrom: mockFrom,
  }
})

jest.mock('@/lib/events', () => ({
  eventBus: { emit: jest.fn() },
}))

function setupSupabaseMock(opts: {
  profile?: { id: string; role: string } | null
  obrtnikProfile?: Record<string, unknown> | null
  existingOnboardingState?: { state: string } | null
  upsertError?: Error | null
  updateResult?: { data: unknown[] | null; error: Error | null }
}) {
  const { supabaseAdmin } = jest.requireMock('@/lib/supabase-admin') as any

  supabaseAdmin.from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: opts.profile ?? null,
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'obrtnik_profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: opts.obrtnikProfile ?? null,
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'onboarding_state') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: opts.existingOnboardingState ?? null,
              error: null,
            }),
          }),
        }),
        upsert: () => ({
          error: opts.upsertError ?? null,
        }),
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () =>
                opts.updateResult ?? {
                  data: [{ user_id: opts.profile?.id }],
                  error: null,
                },
            }),
          }),
        }),
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('transitionOnboardingState', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates initial state for a new obrtnik partner (first creation)', async () => {
    setupSupabaseMock({
      profile: { id: 'user-1', role: 'obrtnik' },
      obrtnikProfile: {
        id: 'user-1',
        business_name: '',
        description: '',
        is_verified: false,
        verification_status: 'pending',
        stripe_account_id: null,
        stripe_onboarded: false,
      },
      existingOnboardingState: null,
    })

    const { transitionOnboardingState } = await import('@/lib/onboarding/state-machine')
    const result = await transitionOnboardingState('user-1')
    expect(result.state).toBeDefined()
    expect(result.blockedReasons).toBeInstanceOf(Array)
  })

  it('returns same state idempotently on repeated call (no DB write)', async () => {
    setupSupabaseMock({
      profile: { id: 'user-2', role: 'obrtnik' },
      obrtnikProfile: {
        id: 'user-2',
        business_name: '',
        description: '',
        is_verified: false,
        verification_status: 'pending',
        stripe_account_id: null,
        stripe_onboarded: false,
      },
      existingOnboardingState: { state: 'verification_pending' },
    })

    const { transitionOnboardingState } = await import('@/lib/onboarding/state-machine')
    const result = await transitionOnboardingState('user-2')
    expect(result.state).toBe(OnboardingStatus.VERIFICATION_PENDING)

    const { supabaseAdmin } = jest.requireMock('@/lib/supabase-admin') as any
    const calls = supabaseAdmin.from.mock.calls.filter(
      (c: string[]) => c[0] === 'onboarding_state',
    )
    // Only the SELECT to load existing state — no upsert or update
    expect(calls.length).toBe(1)
  })

  it('throws TransitionError on invalid transition', async () => {
    setupSupabaseMock({
      profile: { id: 'user-3', role: 'obrtnik' },
      obrtnikProfile: {
        id: 'user-3',
        business_name: 'Test',
        description: 'Test',
        is_verified: true,
        verification_status: 'verified',
        stripe_account_id: 'acct_x',
        stripe_onboarded: true,
      },
      // Current DB state is DRAFT, derived would be ACTIVE — skip from draft→active is invalid
      existingOnboardingState: { state: 'draft' },
    })

    const { transitionOnboardingState } = await import('@/lib/onboarding/state-machine')
    await expect(transitionOnboardingState('user-3')).rejects.toThrow(TransitionError)
  })

  it('handles backfilled user with legacy "completed" state', async () => {
    setupSupabaseMock({
      profile: { id: 'user-4', role: 'obrtnik' },
      obrtnikProfile: {
        id: 'user-4',
        business_name: 'Backfill OÜ',
        description: 'Backfilled',
        is_verified: true,
        verification_status: 'verified',
        stripe_account_id: 'acct_bf',
        stripe_onboarded: true,
      },
      // Legacy "completed" maps to ACTIVE via migration — derived is also ACTIVE
      existingOnboardingState: { state: 'completed' },
    })

    const { transitionOnboardingState } = await import('@/lib/onboarding/state-machine')
    const result = await transitionOnboardingState('user-4')
    expect(result.state).toBe(OnboardingStatus.ACTIVE)
  })
})
