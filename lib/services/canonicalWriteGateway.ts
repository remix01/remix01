import { supabaseAdmin } from '@/lib/supabase-admin'

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
    const { data, error } = await supabaseAdmin.from('notifications').insert(payload).select('*').single()
    if (error) throw error
    logCanonical('notification', data?.id ?? null, writeSource, 'insert')
    return data
  },
}

export const LEGACY_UNSAFE_WRITES_DEPRECATED = Object.freeze({
  directDomainTableWrites: 'deprecated-compatibility-only',
})
