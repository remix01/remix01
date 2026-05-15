/**
 * Authoritative status enums for all lifecycle entities.
 *
 * Every status value used in DB writes, API responses, or transition guards
 * MUST come from these enums. String literals elsewhere should reference
 * these types so the compiler catches drift.
 */

// ── ONBOARDING ──────────────────────────────────────────────
export const OnboardingStatus = {
  DRAFT: 'draft',
  PROFILE_INCOMPLETE: 'profile_incomplete',
  REGISTERED: 'registered',
  EMAIL_VERIFIED: 'email_verified',
  PROFILE_COMPLETED: 'profile_completed',
  PAYMENT_CONNECTED: 'payment_connected',
  VERIFICATION_PENDING: 'verification_pending',
  PAYOUT_SETUP_REQUIRED: 'payout_setup_required',
  ACTIVE: 'active',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const

export type OnboardingStatus = (typeof OnboardingStatus)[keyof typeof OnboardingStatus]

export const ONBOARDING_TRANSITIONS: Record<OnboardingStatus, readonly OnboardingStatus[]> = {
  [OnboardingStatus.DRAFT]:                  [OnboardingStatus.REGISTERED, OnboardingStatus.PROFILE_INCOMPLETE, OnboardingStatus.REJECTED],
  [OnboardingStatus.REGISTERED]:             [OnboardingStatus.EMAIL_VERIFIED, OnboardingStatus.PROFILE_COMPLETED, OnboardingStatus.REJECTED],
  [OnboardingStatus.EMAIL_VERIFIED]:         [OnboardingStatus.PROFILE_COMPLETED, OnboardingStatus.PAYMENT_CONNECTED, OnboardingStatus.PAYOUT_SETUP_REQUIRED, OnboardingStatus.REJECTED],
  [OnboardingStatus.PROFILE_COMPLETED]:      [OnboardingStatus.EMAIL_VERIFIED, OnboardingStatus.PAYMENT_CONNECTED, OnboardingStatus.PAYOUT_SETUP_REQUIRED, OnboardingStatus.REJECTED],
  [OnboardingStatus.PAYMENT_CONNECTED]:      [OnboardingStatus.ACTIVE, OnboardingStatus.PAYOUT_SETUP_REQUIRED],
  [OnboardingStatus.PROFILE_INCOMPLETE]:     [OnboardingStatus.VERIFICATION_PENDING, OnboardingStatus.REJECTED],
  [OnboardingStatus.VERIFICATION_PENDING]:   [OnboardingStatus.PAYOUT_SETUP_REQUIRED, OnboardingStatus.PAYMENT_CONNECTED, OnboardingStatus.REJECTED],
  [OnboardingStatus.PAYOUT_SETUP_REQUIRED]:  [OnboardingStatus.ACTIVE],
  [OnboardingStatus.ACTIVE]:                 [OnboardingStatus.SUSPENDED],
  [OnboardingStatus.REJECTED]:               [OnboardingStatus.DRAFT],
  [OnboardingStatus.SUSPENDED]:              [OnboardingStatus.ACTIVE],
}

export const ONBOARDING_TERMINAL: ReadonlySet<OnboardingStatus> = new Set([])

// ── LEAD ────────────────────────────────────────────────────
export const LeadStatus = {
  LEAD: 'lead',
  QUALIFIED: 'qualified',
  CLAIMED: 'claimed',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  REJECTED: 'rejected',
} as const

export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus]

export const LEAD_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  [LeadStatus.LEAD]:      [LeadStatus.QUALIFIED, LeadStatus.ACTIVE, LeadStatus.REJECTED],
  [LeadStatus.QUALIFIED]:  [LeadStatus.CLAIMED, LeadStatus.ACTIVE, LeadStatus.REJECTED],
  [LeadStatus.CLAIMED]:    [LeadStatus.ACTIVE, LeadStatus.INACTIVE, LeadStatus.REJECTED],
  [LeadStatus.ACTIVE]:     [LeadStatus.INACTIVE],
  [LeadStatus.INACTIVE]:   [LeadStatus.ACTIVE],
  [LeadStatus.REJECTED]:   [],
}

export const LEAD_TERMINAL: ReadonlySet<LeadStatus> = new Set([
  LeadStatus.REJECTED,
])

// Backward-compatible mapping: old statuses → new canonical values
export const LEAD_STATUS_MIGRATION: Record<string, LeadStatus> = {
  lead: LeadStatus.LEAD,
  claimed: LeadStatus.CLAIMED,
  active: LeadStatus.ACTIVE,
  inactive: LeadStatus.INACTIVE,
  qualified: LeadStatus.QUALIFIED,
  rejected: LeadStatus.REJECTED,
}

// ── PAYMENT ─────────────────────────────────────────────────
export const PaymentStatus = {
  PENDING: 'pending',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed',
  RECONCILED: 'reconciled',
} as const

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  [PaymentStatus.PENDING]:     [PaymentStatus.AUTHORIZED, PaymentStatus.FAILED],
  [PaymentStatus.AUTHORIZED]:  [PaymentStatus.CAPTURED, PaymentStatus.REFUNDED, PaymentStatus.FAILED],
  [PaymentStatus.CAPTURED]:    [PaymentStatus.REFUNDED, PaymentStatus.DISPUTED, PaymentStatus.RECONCILED],
  [PaymentStatus.FAILED]:      [PaymentStatus.PENDING],
  [PaymentStatus.REFUNDED]:    [],
  [PaymentStatus.DISPUTED]:    [PaymentStatus.CAPTURED, PaymentStatus.REFUNDED],
  [PaymentStatus.RECONCILED]:  [],
}

export const PAYMENT_TERMINAL: ReadonlySet<PaymentStatus> = new Set([
  PaymentStatus.REFUNDED,
  PaymentStatus.RECONCILED,
])

// Mapping from existing escrow statuses to PaymentStatus
export const PAYMENT_STATUS_MIGRATION: Record<string, PaymentStatus> = {
  pending: PaymentStatus.PENDING,
  paid: PaymentStatus.AUTHORIZED,
  released: PaymentStatus.CAPTURED,
  refunded: PaymentStatus.REFUNDED,
  disputed: PaymentStatus.DISPUTED,
  cancelled: PaymentStatus.FAILED,
}
