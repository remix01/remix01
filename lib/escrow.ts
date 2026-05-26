import { supabaseAdmin } from '@/lib/supabase-admin'

// ── TYPES
export type EscrowStatus =
  | 'pending' | 'paid' | 'released'
  | 'refunded' | 'disputed' | 'cancelled'
  | 'releasing' | 'resolving'

export type AuditEventType =
  | 'created' | 'paid' | 'released' | 'refunded'
  | 'dispute_opened' | 'dispute_resolved' | 'cancelled'

export const ALLOWED_ESCROW_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['released', 'refunded', 'disputed', 'releasing'],
  released: [],
  refunded: [],
  disputed: ['released', 'refunded', 'resolving'],
  cancelled: [],
  releasing: ['paid', 'released', 'cancelled', 'refunded'],
  resolving: ['disputed', 'released', 'refunded'],
}

// ── AUDIT LOG
/**
 * Zapiši vsak escrow dogodek v nespremenljiv audit log.
 * Nikoli ne vrže napake — audit je best-effort.
 */
export async function writeAuditLog(params: {
  transactionId: string
  eventType:     AuditEventType
  actor:         'customer' | 'partner' | 'system' | 'admin'
  actorId?:      string
  statusBefore?: EscrowStatus | null
  statusAfter?:  EscrowStatus | null
  amountCents?:  number
  stripeEventId?: string
  metadata?:     Record<string, unknown>
}): Promise<void> {
  try {
    await supabaseAdmin.from('escrow_audit_log').insert({
      transaction_id: params.transactionId,
      action: params.eventType,
      performed_by: null,
      old_state: params.statusBefore ? { status: params.statusBefore, actor: params.actor } as import('@/types/supabase').Json : null,
      new_state: { status: params.statusAfter, actor: params.actor, amount_cents: params.amountCents, stripe_event_id: params.stripeEventId, ...(params.metadata ?? {}) } as import('@/types/supabase').Json,
    })
  } catch (err) {
    // Audit log nikoli ne sme blokirati glavnega toka
    console.error('[AUDIT LOG FAIL]', err)
  }
}

// ── IDEMPOTENTNOST
/**
 * Preveri ali je bil Stripe event že obdelan.
 * Ključno za preprečitev dvojnega procesiranja.
 */
export async function isStripeEventProcessed(
  stripeEventId: string
): Promise<boolean> {
  // stripe_event_id idempotency not tracked in current schema — always allow processing
  void stripeEventId
  return false
}

// ── STANJE TRANSAKCIJE
export async function getEscrowTransaction(id: string) {
  const { data, error } = await supabaseAdmin
    .from('escrow_transactions')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`[ESCROW] getTransaction: ${error.message}`)
  if (!data) return null
  return data
}

export async function getEscrowByPaymentIntent(stripePaymentIntentId: string) {
  const { data, error } = await supabaseAdmin
    .from('escrow_transactions')
    .select('*')
    .eq('stripe_payment_intent_id', stripePaymentIntentId)
    .maybeSingle()
  if (error) throw new Error(`[ESCROW] getByPI: ${error.message}`)
  if (!data) return null
  return data
}

// ── POSODOBI STATUS (z audit logom)
export async function updateEscrowStatus(params: {
  transactionId:  string
  newStatus:      EscrowStatus
  actor:          'customer' | 'partner' | 'system' | 'admin'
  actorId?:       string
  stripeEventId?: string
  extraFields?:   Record<string, unknown>
  metadata?:      Record<string, unknown>
}): Promise<void> {
  // Preberi trenutno stanje
  const current = await getEscrowTransaction(params.transactionId)
  if (!current) {
    throw new Error('[ESCROW] updateStatus: transaction not found')
  }

  const statusBefore = current.status as EscrowStatus

  const allowedTransitions = ALLOWED_ESCROW_TRANSITIONS[statusBefore] ?? []
  const isSameStatus = statusBefore === params.newStatus
  if (!isSameStatus && !allowedTransitions.includes(params.newStatus)) {
    throw new Error(
      `[ESCROW] Invalid transition: ${statusBefore} -> ${params.newStatus}`
    )
  }

  // Atomic conditional update — only succeeds if status hasn't changed since read
  const { data: updated, error } = await supabaseAdmin
    .from('escrow_transactions')
    .update({
      status: params.newStatus,
      ...(params.extraFields ?? {}),
    })
    .eq('id', params.transactionId)
    .eq('status', statusBefore)
    .select('id')

  if (error) {
    throw new Error(`[ESCROW] updateStatus: ${error.message}`)
  }

  if (!updated || updated.length === 0) {
    throw new Error(
      `[ESCROW] Concurrent modification detected on ${params.transactionId} — expected status '${statusBefore}'`
    )
  }

  // Zapiši v audit log
  await writeAuditLog({
    transactionId:  params.transactionId,
    eventType:      params.newStatus as AuditEventType,
    actor:          params.actor,
    actorId:        params.actorId,
    statusBefore,
    statusAfter:    params.newStatus,
    amountCents:    current.amount_total_cents,
    stripeEventId:  params.stripeEventId,
    metadata:       params.metadata,
  })
}
