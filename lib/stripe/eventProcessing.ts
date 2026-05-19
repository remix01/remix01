import { supabaseAdmin } from '@/lib/supabase-admin'

export async function claimStripeEventProcessing(eventId: string, eventType: string): Promise<boolean> {
  const key = `stripe_event:${eventId}`

  // Try inserting a new claim first (common path)
  const { error } = await supabaseAdmin.from('event_processing_log').insert({
    idempotency_key: key,
    consumer: 'stripe_webhook',
    event_name: eventType,
    entity_id: eventId,
  })

  if (!error) return true

  if (error.code === '23505') {
    // Row exists — re-claim only if it previously failed (allows Stripe retries)
    const { data: reclaimed } = await supabaseAdmin
      .from('event_processing_log')
      .update({ status: 'processing', failed_at: null })
      .eq('idempotency_key', key)
      .eq('status', 'failed')
      .select('id')

    return (reclaimed?.length ?? 0) > 0
  }

  throw new Error(`[WEBHOOK] Failed to claim Stripe event processing: ${error.message}`)
}

/**
 * Mark a claimed event as failed so it can be retried by Stripe.
 * We update status rather than deleting the row to prevent duplicate
 * processing if the handler partially succeeded before throwing.
 * Stripe retries will see the 'failed' status and can re-claim.
 */
export async function releaseStripeEventClaim(eventId: string): Promise<void> {
  const key = `stripe_event:${eventId}`
  const { error } = await supabaseAdmin
    .from('event_processing_log')
    .update({ status: 'failed', failed_at: new Date().toISOString() })
    .eq('idempotency_key', key)

  if (error) {
    throw new Error(`[WEBHOOK] Failed to release Stripe event claim: ${error.message}`)
  }
}

