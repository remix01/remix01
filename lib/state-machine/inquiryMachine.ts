import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * INQUIRY STATE MACHINE
 * 
 * Valid transitions for inquiries table:
 * pending      → open inquiry, waiting for offers
 * offer_received → at least one offer received
 * accepted     → naročnik accepted an offer
 * completed    → work finished, no more changes
 * closed       → terminal: inquiry closed without completion
 */
const inquiryTransitions: Record<string, string[]> = {
  pending: ['offer_received', 'closed'],        // Can get offers or be closed
  offer_received: ['accepted', 'pending'],      // Can accept offer or re-open for more offers
  accepted: ['completed', 'closed'],            // Can complete or cancel after accepting
  completed: [],                                 // TERMINAL: work done
  closed: [],                                    // TERMINAL: inquiry closed
}

// Terminal states that can NEVER transition
const TERMINAL_STATES = new Set(['completed', 'closed'])

/**
 * Assert valid inquiry state transition
 * 
 * @param inquiryId - UUID of inquiries record
 * @param targetStatus - desired new status
 * @throws { code: 409, error: string } if transition is invalid
 * @throws { code: 404, error: string } if inquiry not found
 * @throws { code: 500, error: string } if DB error
 */
export async function assertInquiryTransition(inquiryId: string, targetStatus: string): Promise<void> {
  // Fetch current inquiry status
  const { data: inquiry, error } = await supabaseAdmin
    .from('inquiries')
    .select('status')
    .eq('id', inquiryId)
    .maybeSingle()

  if (error) {
    console.error('[STATE-MACHINE] DB error fetching inquiry:', error)
    throw { code: 500, error: 'Failed to verify inquiry state' }
  }

  if (!inquiry) {
    throw { code: 404, error: `Inquiry ${inquiryId} not found` }
  }

  const currentStatus = inquiry.status

  // Hard reject if currently in terminal state
  if (TERMINAL_STATES.has(currentStatus)) {
    console.warn(
      `[STATE-MACHINE] Rejected: inquiry ${inquiryId} in terminal state ${currentStatus}, cannot transition to ${targetStatus}`
    )
    throw {
      code: 409,
      error: `Cannot transition from terminal state '${currentStatus}'`,
    }
  }

  // Check if target status is valid
  const allowed = inquiryTransitions[currentStatus] ?? []
  if (!allowed.includes(targetStatus)) {
    console.warn(
      `[STATE-MACHINE] Rejected: invalid inquiry transition ${currentStatus} → ${targetStatus}`
    )
    throw {
      code: 409,
      error: `Invalid transition: ${currentStatus} → ${targetStatus}`,
    }
  }

  console.log(`[STATE-MACHINE] Valid inquiry transition: ${currentStatus} → ${targetStatus}`)
}
