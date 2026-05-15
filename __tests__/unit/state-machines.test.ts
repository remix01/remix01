import { assertTransitionValid, TransitionError } from '@/lib/state-machine/transition'
import {
  OnboardingStatus,
  ONBOARDING_TRANSITIONS,
  ONBOARDING_TERMINAL,
  LeadStatus,
  LEAD_TRANSITIONS,
  LEAD_TERMINAL,
  PaymentStatus,
  PAYMENT_TRANSITIONS,
  PAYMENT_TERMINAL,
  LEAD_STATUS_MIGRATION,
  PAYMENT_STATUS_MIGRATION,
} from '@/lib/state-machine/statuses'

describe('Generic transition guard', () => {
  it('allows a valid transition', () => {
    const result = assertTransitionValid(
      LeadStatus.LEAD,
      LeadStatus.QUALIFIED,
      LEAD_TRANSITIONS,
      LEAD_TERMINAL,
    )
    expect(result.allowed).toBe(true)
    expect(result.from).toBe('lead')
    expect(result.to).toBe('qualified')
  })

  it('rejects transition from terminal state', () => {
    expect(() =>
      assertTransitionValid(
        LeadStatus.REJECTED,
        LeadStatus.ACTIVE,
        LEAD_TRANSITIONS,
        LEAD_TERMINAL,
      ),
    ).toThrow(TransitionError)

    try {
      assertTransitionValid(LeadStatus.REJECTED, LeadStatus.ACTIVE, LEAD_TRANSITIONS, LEAD_TERMINAL)
    } catch (err) {
      expect(err).toBeInstanceOf(TransitionError)
      const te = err as TransitionError
      expect(te.code).toBe(409)
      expect(te.reason).toBe('TERMINAL_STATE')
      expect(te.from).toBe('rejected')
      expect(te.to).toBe('active')
    }
  })

  it('rejects an undefined transition', () => {
    expect(() =>
      assertTransitionValid(
        LeadStatus.ACTIVE,
        LeadStatus.LEAD,
        LEAD_TRANSITIONS,
        LEAD_TERMINAL,
      ),
    ).toThrow(TransitionError)

    try {
      assertTransitionValid(LeadStatus.ACTIVE, LeadStatus.LEAD, LEAD_TRANSITIONS, LEAD_TERMINAL)
    } catch (err) {
      const te = err as TransitionError
      expect(te.reason).toBe('INVALID_TRANSITION')
    }
  })
})

describe('LeadStatus state machine', () => {
  it('lead → qualified is valid', () => {
    const r = assertTransitionValid(LeadStatus.LEAD, LeadStatus.QUALIFIED, LEAD_TRANSITIONS, LEAD_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('lead → rejected is valid', () => {
    const r = assertTransitionValid(LeadStatus.LEAD, LeadStatus.REJECTED, LEAD_TRANSITIONS, LEAD_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('qualified → active is valid', () => {
    const r = assertTransitionValid(LeadStatus.QUALIFIED, LeadStatus.ACTIVE, LEAD_TRANSITIONS, LEAD_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('active → inactive is valid', () => {
    const r = assertTransitionValid(LeadStatus.ACTIVE, LeadStatus.INACTIVE, LEAD_TRANSITIONS, LEAD_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('inactive → active is valid (reactivation)', () => {
    const r = assertTransitionValid(LeadStatus.INACTIVE, LeadStatus.ACTIVE, LEAD_TRANSITIONS, LEAD_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('rejected is terminal', () => {
    expect(() =>
      assertTransitionValid(LeadStatus.REJECTED, LeadStatus.LEAD, LEAD_TRANSITIONS, LEAD_TERMINAL),
    ).toThrow(TransitionError)
  })

  it('lead → active is valid (auto-process shortcut for pre-screened imports)', () => {
    const r = assertTransitionValid(LeadStatus.LEAD, LeadStatus.ACTIVE, LEAD_TRANSITIONS, LEAD_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('active → lead is invalid (no backward jump)', () => {
    expect(() =>
      assertTransitionValid(LeadStatus.ACTIVE, LeadStatus.LEAD, LEAD_TRANSITIONS, LEAD_TERMINAL),
    ).toThrow(TransitionError)
  })
})

describe('PaymentStatus state machine', () => {
  it('pending → authorized is valid', () => {
    const r = assertTransitionValid(PaymentStatus.PENDING, PaymentStatus.AUTHORIZED, PAYMENT_TRANSITIONS, PAYMENT_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('authorized → captured is valid', () => {
    const r = assertTransitionValid(PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED, PAYMENT_TRANSITIONS, PAYMENT_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('captured → refunded is valid', () => {
    const r = assertTransitionValid(PaymentStatus.CAPTURED, PaymentStatus.REFUNDED, PAYMENT_TRANSITIONS, PAYMENT_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('captured → disputed is valid', () => {
    const r = assertTransitionValid(PaymentStatus.CAPTURED, PaymentStatus.DISPUTED, PAYMENT_TRANSITIONS, PAYMENT_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('disputed → captured is valid (dispute resolved in favor)', () => {
    const r = assertTransitionValid(PaymentStatus.DISPUTED, PaymentStatus.CAPTURED, PAYMENT_TRANSITIONS, PAYMENT_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('refunded is terminal', () => {
    expect(() =>
      assertTransitionValid(PaymentStatus.REFUNDED, PaymentStatus.PENDING, PAYMENT_TRANSITIONS, PAYMENT_TERMINAL),
    ).toThrow(TransitionError)
  })

  it('reconciled is terminal', () => {
    expect(() =>
      assertTransitionValid(PaymentStatus.RECONCILED, PaymentStatus.CAPTURED, PAYMENT_TRANSITIONS, PAYMENT_TERMINAL),
    ).toThrow(TransitionError)
  })

  it('pending → captured is invalid (must authorize first)', () => {
    expect(() =>
      assertTransitionValid(PaymentStatus.PENDING, PaymentStatus.CAPTURED, PAYMENT_TRANSITIONS, PAYMENT_TERMINAL),
    ).toThrow(TransitionError)
  })

  it('failed → pending is valid (retry)', () => {
    const r = assertTransitionValid(PaymentStatus.FAILED, PaymentStatus.PENDING, PAYMENT_TRANSITIONS, PAYMENT_TERMINAL)
    expect(r.allowed).toBe(true)
  })
})

describe('OnboardingStatus state machine', () => {
  it('draft → profile_incomplete is valid', () => {
    const r = assertTransitionValid(OnboardingStatus.DRAFT, OnboardingStatus.PROFILE_INCOMPLETE, ONBOARDING_TRANSITIONS, ONBOARDING_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('profile_incomplete → verification_pending is valid', () => {
    const r = assertTransitionValid(OnboardingStatus.PROFILE_INCOMPLETE, OnboardingStatus.VERIFICATION_PENDING, ONBOARDING_TRANSITIONS, ONBOARDING_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('verification_pending → payout_setup_required is valid', () => {
    const r = assertTransitionValid(OnboardingStatus.VERIFICATION_PENDING, OnboardingStatus.PAYOUT_SETUP_REQUIRED, ONBOARDING_TRANSITIONS, ONBOARDING_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('payout_setup_required → active is valid', () => {
    const r = assertTransitionValid(OnboardingStatus.PAYOUT_SETUP_REQUIRED, OnboardingStatus.ACTIVE, ONBOARDING_TRANSITIONS, ONBOARDING_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('active → suspended is valid', () => {
    const r = assertTransitionValid(OnboardingStatus.ACTIVE, OnboardingStatus.SUSPENDED, ONBOARDING_TRANSITIONS, ONBOARDING_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('suspended → active is valid (reinstatement)', () => {
    const r = assertTransitionValid(OnboardingStatus.SUSPENDED, OnboardingStatus.ACTIVE, ONBOARDING_TRANSITIONS, ONBOARDING_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('rejected → draft is valid (reapply)', () => {
    const r = assertTransitionValid(OnboardingStatus.REJECTED, OnboardingStatus.DRAFT, ONBOARDING_TRANSITIONS, ONBOARDING_TERMINAL)
    expect(r.allowed).toBe(true)
  })

  it('active → draft is invalid', () => {
    expect(() =>
      assertTransitionValid(OnboardingStatus.ACTIVE, OnboardingStatus.DRAFT, ONBOARDING_TRANSITIONS, ONBOARDING_TERMINAL),
    ).toThrow(TransitionError)
  })
})

describe('Status migration maps', () => {
  it('maps old lead statuses to new ones', () => {
    expect(LEAD_STATUS_MIGRATION['lead']).toBe(LeadStatus.LEAD)
    expect(LEAD_STATUS_MIGRATION['active']).toBe(LeadStatus.ACTIVE)
    expect(LEAD_STATUS_MIGRATION['claimed']).toBe(LeadStatus.CLAIMED)
    expect(LEAD_STATUS_MIGRATION['inactive']).toBe(LeadStatus.INACTIVE)
  })

  it('maps old escrow statuses to PaymentStatus', () => {
    expect(PAYMENT_STATUS_MIGRATION['pending']).toBe(PaymentStatus.PENDING)
    expect(PAYMENT_STATUS_MIGRATION['paid']).toBe(PaymentStatus.AUTHORIZED)
    expect(PAYMENT_STATUS_MIGRATION['released']).toBe(PaymentStatus.CAPTURED)
    expect(PAYMENT_STATUS_MIGRATION['refunded']).toBe(PaymentStatus.REFUNDED)
    expect(PAYMENT_STATUS_MIGRATION['disputed']).toBe(PaymentStatus.DISPUTED)
    expect(PAYMENT_STATUS_MIGRATION['cancelled']).toBe(PaymentStatus.FAILED)
  })
})

describe('TransitionError', () => {
  it('has correct code and properties', () => {
    const err = new TransitionError('pending', 'completed', 'INVALID_TRANSITION')
    expect(err.code).toBe(409)
    expect(err.from).toBe('pending')
    expect(err.to).toBe('completed')
    expect(err.reason).toBe('INVALID_TRANSITION')
    expect(err.name).toBe('TransitionError')
    expect(err.message).toContain('Invalid transition')
  })

  it('terminal state error has correct message', () => {
    const err = new TransitionError('refunded', 'pending', 'TERMINAL_STATE')
    expect(err.message).toContain('terminal state')
    expect(err.message).toContain('refunded')
  })
})
