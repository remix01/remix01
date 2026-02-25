import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getEscrowTransaction, updateEscrowStatus, writeAuditLog } from '@/lib/escrow'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '@/lib/rateLimit'
import { validateStringLength, collectErrors } from '@/lib/validation'
import { badRequest, unauthorized, conflict, internalError, apiSuccess } from '@/lib/api-response'
import { assertEscrowTransition } from '@/lib/agent/state-machine'

export async function POST(request: NextRequest) {
  try {
    // 1. AVTENTIKACIJA
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (n) => cookieStore.get(n)?.value } }
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return unauthorized()
    }

    // Rate limit check
    const { allowed, retryAfter } = checkRateLimit(
      `dispute:${session.user.id}`,
      3,       // max 3 disputes
      60_000   // per minute
    )
    if (!allowed) {
      return badRequest(`Too many requests. Try again in ${retryAfter}s.`)
    }

    const { escrowId, reason, description } = await request.json()

    // INPUT VALIDATION
    const validationErrors = collectErrors(
      validateStringLength(reason, 'reason', 10, 1000),
      validateStringLength(escrowId, 'escrowId', 1, 100)
    )

    if (validationErrors.length > 0) {
      return badRequest(validationErrors.map(e => `${e.field}: ${e.message}`).join('; '))
    }

    // 2. PREBERI TRANSAKCIJO
    const escrow = await getEscrowTransaction(escrowId)

    // 2.5 STATE MACHINE GUARD — enforce valid transitions
    // This runs AFTER permission checks, BEFORE DB writes
    try {
      await assertEscrowTransition(escrowId, 'disputed')
    } catch (error: any) {
      // State machine rejected the transition
      if (error.code === 409) {
        return conflict(error.error)
      }
      if (error.code === 404) {
        return badRequest(error.error)
      }
      throw error
    }

    // 3. SAMO 'paid' TRANSAKCIJE IMAJO LAHKO SPOR
    if (!['paid'].includes(escrow.status)) {
      return badRequest('Disputes are only allowed for paid transactions.')
    }

    // 4. PREVERI DA SPOR ŠE NI ODPRT
    const { count } = await supabaseAdmin
      .from('escrow_disputes')
      .select('id', { count: 'exact', head: true })
      .eq('transaction_id', escrowId)
    if ((count ?? 0) > 0) {
      return conflict('A dispute is already open for this transaction.')
    }

    // 5. DOLOČI KDO ODPIRA SPOR
    const isPartner  = escrow.partner_id === session.user.id
    const openedBy   = isPartner ? 'partner' : 'customer'

    // 6. USTVARI SPOR
    const { error: disputeErr } = await supabaseAdmin
      .from('escrow_disputes')
      .insert({
        transaction_id: escrowId,
        opened_by:      openedBy,
        opened_by_id:   session.user.id,
        reason:         trimmedReason,
        description:    description?.trim() ?? null,
        status:         'open',
      })

    if (disputeErr) throw new Error(disputeErr.message)

    // 7. POSODOBI ESCROW STATUS
    await updateEscrowStatus({
      transactionId: escrow.id,
      newStatus:     'disputed',
      actor:         openedBy,
      actorId:       session.user.id,
      metadata:      { reason: trimmedReason, openedBy },
    })

    // 8. OBVESTI ADMIN (email prek lib/email.ts)
    // await sendAdminDisputeAlert({ escrowId, openedBy, reason })

    return apiSuccess({ message: 'Dispute opened. Our team will review within 24 hours.' })

  } catch (err) {
    console.error('[ESCROW DISPUTE]', err)
    return internalError('Failed to open dispute.')
  }
}
