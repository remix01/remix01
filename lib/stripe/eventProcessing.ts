import { supabaseAdmin } from '@/lib/supabase-admin'

export async function claimStripeEventProcessing(eventId: string, eventType: string): Promise<boolean> {
  const key = `stripe_event:${eventId}`
  const { error } = await supabaseAdmin.from('event_processing_log').insert({
    idempotency_key: key,
    consumer: 'stripe_webhook',
    event_name: eventType,
    entity_id: eventId,
  })

  if (!error) return true
  if (error.code === '23505') return false
  throw new Error(`[WEBHOOK] Failed to claim Stripe event processing: ${error.message}`)
}

export async function releaseStripeEventClaim(eventId: string): Promise<void> {
  const key = `stripe_event:${eventId}`
  const { error } = await supabaseAdmin
    .from('event_processing_log')
    .delete()
    .eq('idempotency_key', key)

  if (error) {
    throw new Error(`[WEBHOOK] Failed to release Stripe event claim: ${error.message}`)
  }
}
