import type { OnboardingStatus } from '@/lib/state-machine/statuses'

export const PartnerOnboardingStatus = {
  DRAFT: 'draft',
  REGISTERED: 'registered',
  EMAIL_VERIFIED: 'email_verified',
  PROFILE_COMPLETED: 'profile_completed',
  PAYMENT_CONNECTED: 'payment_connected',
  ACTIVE: 'active',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const

export type PartnerOnboardingStatus = (typeof PartnerOnboardingStatus)[keyof typeof PartnerOnboardingStatus]

export const PARTNER_ONBOARDING_ORDER: readonly PartnerOnboardingStatus[] = [
  PartnerOnboardingStatus.DRAFT,
  PartnerOnboardingStatus.REGISTERED,
  PartnerOnboardingStatus.EMAIL_VERIFIED,
  PartnerOnboardingStatus.PROFILE_COMPLETED,
  PartnerOnboardingStatus.PAYMENT_CONNECTED,
  PartnerOnboardingStatus.ACTIVE,
]

export function isPartnerActiveStatus(status: PartnerOnboardingStatus | OnboardingStatus): boolean {
  return status === PartnerOnboardingStatus.ACTIVE
}
