import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendNotification, type NotificationPayload } from '@/lib/notifications'

const CANONICAL_VERSION = 'v1'

type WriteSource = string

function logCanonical(entity: string, entityId: string | null, writeSource: WriteSource, op: string) {
  console.log('[canonical-write]', {
    entity,
    entity_id: entityId,
    write_source: writeSource,
    canonical_version: CANONICAL_VERSION,
    operation: op,
  })
}

export const canonicalWriteGateway = {
  async createOrUpdateProfile(payload: Record<string, any>, writeSource: WriteSource) {
    const { data, error } = await supabaseAdmin.from('profiles').upsert(payload).select('*').single()
    if (error) throw error
    logCanonical('profile', data?.id ?? payload.id ?? null, writeSource, 'upsert')
    return data
  },

  async createOrUpdateProviderProfile(payload: Record<string, any>, writeSource: WriteSource) {
    const { data, error } = await supabaseAdmin.from('obrtnik_profiles').upsert(payload).select('*').single()
    if (error) throw error
    logCanonical('provider_profile', data?.id ?? payload.id ?? null, writeSource, 'upsert')
    return data
  },

  async createOrUpdatePovprasevanje(id: string, payload: Record<string, any>, writeSource: WriteSource) {
    const { data, error } = await supabaseAdmin.from('povprasevanja').update(payload).eq('id', id).select('*').single()
    if (error) throw error
    logCanonical('povprasevanje', id, writeSource, 'update')
    return data
  },

  async createOrUpdatePonudba(payload: Record<string, any>, writeSource: WriteSource) {
    const { data, error } = await supabaseAdmin.from('ponudbe').upsert(payload).select('*').single()
    if (error) throw error
    logCanonical('ponudba', data?.id ?? payload.id ?? null, writeSource, 'upsert')
    return data
  },

  async createOrUpdateEscrowTransaction(payload: Record<string, any>, writeSource: WriteSource) {
    const { data, error } = await supabaseAdmin.from('escrow_transactions').upsert(payload).select('*').single()
    if (error) throw error
    logCanonical('escrow_transaction', data?.id ?? payload.id ?? null, writeSource, 'upsert')
    return data
  },

  async enqueueOrUpdateTask(payload: Record<string, any>, writeSource: WriteSource) {
    const { data, error } = await supabaseAdmin.from('service_requests').upsert(payload).select('*').single()
    if (error) throw error
    logCanonical('task', data?.id ?? payload.id ?? null, writeSource, 'upsert')
    return data
  },

  async appendNotification(payload: Record<string, any>, writeSource: WriteSource) {
    const result = await sendNotification({
      userId: payload.user_id ?? null,
      type: payload.type,
      title: payload.title,
      message: payload.message || payload.body || '',
      link: payload.link || payload.action_url,
      metadata: payload.metadata || payload.data || {},
    } as NotificationPayload)
    if (!result.success) throw new Error(result.error ?? 'Notification insert failed')
    logCanonical('notification', null, writeSource, 'insert')
    return result
  },

  async deleteProfile(id: string, writeSource: WriteSource) {
    const { error } = await supabaseAdmin.from('profiles').delete().eq('id', id)
    if (error) throw error
    logCanonical('profile', id, writeSource, 'delete')
  },

  async deleteProviderProfile(id: string, writeSource: WriteSource) {
    const { error } = await supabaseAdmin.from('obrtnik_profiles').delete().eq('id', id)
    if (error) throw error
    logCanonical('provider_profile', id, writeSource, 'delete')
  },
}

export const LEGACY_UNSAFE_WRITES_DEPRECATED = Object.freeze({
  directDomainTableWrites: 'deprecated-compatibility-only',
})
