import { supabaseAdmin } from '@/lib/supabase-admin'

// ── TYPES
export type EscrowStatus =
  | 'pending' | 'paid' | 'released'
  | 'refunded' | 'disputed' | 'cancelled'
  | 'releasing' | 'resolving'

export type AuditEventType =
  | 'created' | 'paid' | 'released' | 'refunded'
  | 'dispute_opened' | 'dispute_resolved' | 'cancelled'

const ALLOWED_ESCROW_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['released', 'refunded', 'disputed', 'releasing'],
  released: [],
  refunded: [],
  disputed: ['released', 'refunded', 'resolving'],
  cancelled: [],
  releasing: ['paid', 'released'],
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
      transaction_id:  params.transactionId,
      event_type:      params.eventType,
      actor:           params.actor,
      actor_id:        params.actorId ?? null,
      status_before:   params.statusBefore ?? null,
      status_after:    params.statusAfter ?? null,
      amount_cents:    params.amountCents ?? null,
      stripe_event_id: params.stripeEventId ?? null,
      metadata:        params.metadata ?? {},
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
  const { count } = await supabaseAdmin
    .from('escrow_audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('stripe_event_id', stripeEventId)
  return (count ?? 0) > 0
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

  // Posodobi v DB
  const { error } = await supabaseAdmin
    .from('escrow_transactions')
    .update({
      status: params.newStatus,
      ...(params.extraFields ?? {}),
    })
    .eq('id', params.transactionId)

  if (error) {
    throw new Error(`[ESCROW] updateStatus: ${error.message}`)
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
