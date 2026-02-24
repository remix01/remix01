import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * OFFER (PONUDBE) STATE MACHINE
 * 
 * Valid transitions for ponudbe table (marketplace offers):
 * poslana       → offer sent to naročnik, awaiting response
 * sprejeta      → terminal: naročnik accepted the offer
 * zavrnjena     → terminal: naročnik rejected the offer
 */
const offerTransitions: Record<string, string[]> = {
  poslana: ['sprejeta', 'zavrnjena'],   // Offer awaiting response
  sprejeta: [],                         // TERMINAL: accepted
  zavrnjena: [],                        // TERMINAL: rejected
}

// Terminal states that can NEVER transition
const TERMINAL_STATES = new Set(['sprejeta', 'zavrnjena'])

/**
 * Assert valid offer state transition
 * 
 * @param offerId - UUID of ponudbe record
 * @param targetStatus - desired new status
 * @throws { code: 409, error: string } if transition is invalid
 * @throws { code: 404, error: string } if offer not found
 * @throws { code: 500, error: string } if DB error
 */
export async function assertOfferTransition(offerId: string, targetStatus: string): Promise<void> {
  // Fetch current offer status
  const { data: offer, error } = await supabaseAdmin
    .from('ponudbe')
    .select('status')
    .eq('id', offerId)
    .maybeSingle()

  if (error) {
    console.error('[STATE-MACHINE] DB error fetching offer:', error)
    throw { code: 500, error: 'Failed to verify offer state' }
  }

  if (!offer) {
    throw { code: 404, error: `Offer ${offerId} not found` }
  }

  const currentStatus = offer.status

  // Hard reject if currently in terminal state
  if (TERMINAL_STATES.has(currentStatus)) {
    console.warn(
      `[STATE-MACHINE] Rejected: offer ${offerId} in terminal state ${currentStatus}, cannot transition to ${targetStatus}`
    )
    throw {
      code: 409,
      error: `Cannot transition from terminal state '${currentStatus}'`,
    }
  }

  // Check if target status is valid
  const allowed = offerTransitions[currentStatus] ?? []
  if (!allowed.includes(targetStatus)) {
    console.warn(
      `[STATE-MACHINE] Rejected: invalid offer transition ${currentStatus} → ${targetStatus}`
    )
    throw {
      code: 409,
      error: `Invalid transition: ${currentStatus} → ${targetStatus}`,
    }
  }

  console.log(`[STATE-MACHINE] Valid offer transition: ${currentStatus} → ${targetStatus}`)
}
