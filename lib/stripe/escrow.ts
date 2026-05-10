import { PLATFORM_FEE_PERCENT } from './pricing'

export const ESCROW_AUTO_RELEASE_DAYS = 7

export function calculateEscrow(
  amountCents: number,
  partnerPaket: 'start' | 'pro'
): {
  commissionRate: number
  commissionCents: number
  payoutCents: number
} {
  const rate = PLATFORM_FEE_PERCENT[partnerPaket] / 100
  const commissionCents = Math.round(amountCents * rate)
  return {
    commissionRate: rate,
    commissionCents,
    payoutCents: amountCents - commissionCents,
  }
}
