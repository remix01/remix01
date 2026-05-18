// Data Access Layer - Ponudbe & Ocene
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendNotification } from '@/lib/notifications'
import { enqueue } from '@/lib/jobs/queue'
import type { 
  Ponudba, 
  PonudbaInsert, 
  PonudbaUpdate,
  Ocena,
  OcenaInsert
} from '@/types/marketplace'

class OptimisticLockError extends Error {
  code = 'CONFLICT_RETRYABLE'
  constructor(message: string) {
    super(message)
    this.name = 'OptimisticLockError'
  }
}



/**
 * Get ponudba by ID with relations
 */
export async function getPonudba(id: string): Promise<Ponudba | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ponudbe')
    .select(`
      *,
      povprasevanje:povprasevanja(*),
      obrtnik:obrtnik_profiles(
        *,
        profile:profiles(*)
      ),
      ocena:ocene(*)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error fetching ponudba:', error)
    return null
  }

  return data as unknown as Ponudba
}

/**
 * Get ponudbe for a povprasevanje
 */
export async function getPonudbeForPovprasevanje(povprasevanjeId: string): Promise<Ponudba[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ponudbe')
    .select(`
      *,
      obrtnik:obrtnik_profiles(
        *,
        profile:profiles(*)
      ),
      ocena:ocene(*)
    `)
    .eq('povprasevanje_id', povprasevanjeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[v0] Error fetching ponudbe:', error)
    return []
  }

  return data as unknown as Ponudba[]
}

/**
 * Get ponudbe submitted by an obrtnik
 */
export async function getObrtnikPonudbe(obrtnikId: string, limit?: number): Promise<Ponudba[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('ponudbe')
    .select(`
      *,
      povprasevanje:povprasevanja(
        *,
        narocnik:profiles!povprasevanja_narocnik_id_fkey(*)
      ),
      ocena:ocene(*)
    `)
    .eq('obrtnik_id', obrtnikId)
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('[v0] Error fetching obrtnik ponudbe:', error)
    return []
  }

  return data as unknown as Ponudba[]
}

/**
 * Create ponudba
 */
export async function createPonudba(ponudba: PonudbaInsert): Promise<Ponudba | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ponudbe')
    .insert(ponudba)
    .select(`
      *,
      povprasevanje:povprasevanja(*),
      obrtnik:obrtnik_profiles(
        *,
        profile:profiles(*)
      )
    `)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error creating ponudba:', error)
    return null
  }

  const result = data as unknown as Ponudba

  // Send notification to naročnik about new ponudba
  if (result.povprasevanje?.narocnik_id && result.obrtnik?.profile?.full_name) {
    await sendNotification({
      userId: result.povprasevanje.narocnik_id,
      type: 'nova_ponudba',
      title: 'Nova ponudba prejeta',
      message: `${result.obrtnik.profile.full_name} je poslal ponudbo za vaše povpraševanje.`,
      link: `/narocnik/povprasevanja/${result.povprasevanje.id}`,
      metadata: { ponudbaId: result.id, obrtknikId: result.obrtnik_id }
    }).catch((err: any) => {
      console.error('[v0] Error sending notification:', err)
      // Don't fail the whole operation if notification fails
    })

    let customerEmail = (result.povprasevanje as any)?.stranka_email as string | undefined
    if (!customerEmail && result.povprasevanje?.narocnik_id) {
      const { data: narocnikProfile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', result.povprasevanje.narocnik_id)
        .maybeSingle()
      customerEmail = narocnikProfile?.email || undefined
    }
    const craftsmanName = result.obrtnik.profile.full_name
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://liftgo.net'
    if (customerEmail) {
      const emailPayload = {
        to: customerEmail,
        template: 'marketplace_offer_received',
        ponudbaId: result.id,
        povprasevanjeId: result.povprasevanje.id,
        craftsman_name: craftsmanName,
        price: result.price_estimate ? `€${result.price_estimate}` : 'Po dogovoru',
        message: result.message || '',
        link: `${baseUrl}/narocnik/povprasevanja/${result.povprasevanje.id}`,
      }
      enqueue('sendEmail', emailPayload).catch((err: any) => console.error('[EMAIL] offer notify enqueue failed', err))
      enqueue('sendEmail', { ...emailPayload, customData: { reminder: '24h' } }, { delay: 24 * 60 * 60 }).catch((err: any) => console.error('[EMAIL] offer reminder 24h enqueue failed', err))
      enqueue('sendEmail', { ...emailPayload, customData: { reminder: '48h' } }, { delay: 48 * 60 * 60 }).catch((err: any) => console.error('[EMAIL] offer reminder 48h enqueue failed', err))
    }
  }

  return result
}

/**
 * Update ponudba
 */
export async function updatePonudba(id: string, updates: PonudbaUpdate & { lock_version?: number }): Promise<Ponudba | null> {
  const supabase = await createClient()
  
  const expectedLockVersion = (updates as any).lock_version
  const payload = { ...(updates as any) }
  delete payload.lock_version

  if (typeof expectedLockVersion === 'number') {
    payload.lock_version = expectedLockVersion + 1
  }

  let query = supabase
    .from('ponudbe')
    .update(payload)
    .eq('id', id)

  if (typeof expectedLockVersion === 'number') {
    query = query.eq('lock_version', expectedLockVersion)
  }

  const { data, error } = await query
    .select(`
      *,
      povprasevanje:povprasevanja(*),
      obrtnik:obrtnik_profiles(
        *,
        profile:profiles(*)
      )
    `)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error updating ponudba:', error)
    return null
  }

  if (!data && typeof expectedLockVersion === 'number') {
    throw new OptimisticLockError('[v0] Ponudba update conflict, retry required')
  }

  return data as unknown as Ponudba
}

/**
 * Accept ponudba (changes status to sprejeta)
 */
export async function acceptPonudba(id: string): Promise<boolean> {
  const result = await updatePonudba(id, { status: 'sprejeta' })

  // Send notification to obrtnik that their ponudba was accepted
  if (result) {
    const ponudba = await getPonudba(id)
    if (ponudba?.obrtnik_id && ponudba?.povprasevanje?.title) {
      await sendNotification({
        userId: ponudba.obrtnik_id,
        type: 'ponudba_sprejeta',
        title: 'Ponudba sprejeta! 🎉',
        message: `Vaša ponudba je bila sprejeta. Dogovorite se za termin z naročnikom.`,
        link: '/obrtnik/ponudbe',
        metadata: { ponudbaId: id, povprasevanjeId: ponudba.povprasevanje.id }
      }).catch((err: any) => {
        console.error('[v0] Error sending notification:', err)
      })
    }
  }

  return result !== null
}

/**
 * Full atomic accept flow via Supabase RPC (accept_ponudba).
 * Falls back to sequential writes if the RPC is not yet deployed.
 *
 * 1. Mark ponudba as sprejeta
 * 2. Reject all other pending ponudbe for same povprasevanje
 * 3. Update povprasevanje status to v_teku and set obrtnik_id
 *
 * Returns the accepted ponudba or throws on failure.
 */
export async function acceptPonudbaFull(
  ponudbaId: string,
  povprasevanjeId: string,
  narocnikId: string
): Promise<Ponudba> {
  const supabase = await createClient()

  // Try atomic RPC first (requires migration 20260518_accept_ponudba_rpc.sql)
  const { data: rpcData, error: rpcError } = await supabase.rpc('accept_ponudba', {
    p_ponudba_id: ponudbaId,
    p_povprasevanje_id: povprasevanjeId,
    p_narocnik_id: narocnikId,
  })

  if (!rpcError) {
    // RPC succeeded — fetch and return the accepted ponudba
    const accepted = await getPonudba(ponudbaId)
    if (!accepted) throw new Error('Napaka pri pridobivanju sprejete ponudbe')

    if (rpcData) {
      sendNotification({
        userId: rpcData as string,
        type: 'ponudba_sprejeta',
        title: 'Vaša ponudba je bila sprejeta! 🎉',
        message: 'Stranka je sprejela vašo ponudbo. Dogovorite se za termin z naročnikom.',
        link: '/obrtnik/ponudbe',
        metadata: { ponudbaId, povprasevanjeId },
      }).catch((err: any) => console.error('[v0] Notification error:', err))
    }

    return accepted
  }

  // RPC not available yet — fall back to sequential writes
  console.warn('[v0] accept_ponudba RPC not available, using sequential writes:', rpcError.message)

  // Authorization: ensure the narocnik owns the povprasevanje
  const { data: pov } = await supabase
    .from('povprasevanja')
    .select('id, narocnik_id, status, obrtnik_id')
    .eq('id', povprasevanjeId)
    .maybeSingle()

  if (!pov || pov.narocnik_id !== narocnikId) {
    throw new Error('Nimate dostopa do tega povpraševanja')
  }

  if (['zakljuceno', 'preklicano', 'v_teku'].includes(pov.status)) {
    throw new Error('Povpraševanje ne dovoljuje sprejema ponudbe v trenutnem stanju')
  }

  // Fetch the ponudba and ensure it belongs to this povprasevanje
  const { data: ponudbaData } = await supabase
    .from('ponudbe')
    .select('id, obrtnik_id, status, povprasevanje_id')
    .eq('id', ponudbaId)
    .eq('povprasevanje_id', povprasevanjeId)
    .maybeSingle()

  if (!ponudbaData) {
    throw new Error('Ponudba ni najdena ali ne pripada temu povpraševanju')
  }

  if (ponudbaData.status === 'sprejeta') {
    throw new Error('Ponudba je že sprejeta')
  }

  // Step 1: Accept the selected ponudba
  const { error: acceptError } = await supabase
    .from('ponudbe')
    .update({ status: 'sprejeta', accepted_at: new Date().toISOString() })
    .eq('id', ponudbaId)

  if (acceptError) throw new Error(`Napaka pri sprejemu ponudbe: ${acceptError.message}`)

  // Step 2: Reject all other pending ponudbe
  await supabase
    .from('ponudbe')
    .update({ status: 'zavrnjena' })
    .eq('povprasevanje_id', povprasevanjeId)
    .neq('id', ponudbaId)
    .eq('status', 'poslana')

  // Step 3: Update povprasevanje — set to v_teku and link obrtnik
  const { error: povError } = await supabase
    .from('povprasevanja')
    .update({
      status: 'v_teku',
      obrtnik_id: ponudbaData.obrtnik_id,
    })
    .eq('id', povprasevanjeId)

  if (povError) throw new Error(`Napaka pri posodobitvi povpraševanja: ${povError.message}`)

  // Return the accepted ponudba with relations
  const accepted = await getPonudba(ponudbaId)
  if (!accepted) throw new Error('Napaka pri pridobivanju sprejete ponudbe')

  // Fire notification (non-blocking)
  if (ponudbaData.obrtnik_id) {
    sendNotification({
      userId: ponudbaData.obrtnik_id,
      type: 'ponudba_sprejeta',
      title: 'Vaša ponudba je bila sprejeta! 🎉',
      message: 'Stranka je sprejela vašo ponudbo. Dogovorite se za termin z naročnikom.',
      link: '/obrtnik/ponudbe',
      metadata: { ponudbaId, povprasevanjeId },
    }).catch((err: any) => console.error('[v0] Notification error:', err))
  }

  return accepted
}

/**
 * Reject ponudba (changes status to zavrnjena)
 */
export async function rejectPonudba(id: string): Promise<boolean> {
  const result = await updatePonudba(id, { status: 'zavrnjena' })
  return result !== null
}

/**
 * Count ponudbe by status for an obrtnik
 */
export async function countObrtnikPonudbeByStatus(obrtnikId: string): Promise<Record<string, number>> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ponudbe')
    .select('status')
    .eq('obrtnik_id', obrtnikId)

  if (error) {
    console.error('[v0] Error counting ponudbe:', error)
    return {}
  }

  const counts: Record<string, number> = {}
  data.forEach((item: any) => {
    counts[item.status] = (counts[item.status] || 0) + 1
  })

  return counts
}

// ============================================================================
// OCENE (Reviews)
// ============================================================================

/**
 * Get ocena by ponudba ID
 */
export async function getOcenaByPonudba(ponudbaId: string): Promise<Ocena | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ocene')
    .select(`
      *,
      narocnik:profiles!ocene_narocnik_id_fkey(*),
      obrtnik:obrtnik_profiles(*)
    `)
    .eq('ponudba_id', ponudbaId)
    .maybeSingle()

  if (error) {
    if (error.code === 'PGRST116') {
      // No ocena found
      return null
    }
    console.error('[v0] Error fetching ocena:', error)
    return null
  }

  return data as unknown as Ocena
}

/**
 * Get ocene for an obrtnik
 */
export async function getObrtnikOcene(obrtnikId: string, limit?: number): Promise<Ocena[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('ocene')
    .select(`
      *,
      narocnik:profiles!ocene_narocnik_id_fkey(*),
      ponudba:ponudbe(
        povprasevanje:povprasevanja(*)
      )
    `)
    .eq('obrtnik_id', obrtnikId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('[v0] Error fetching obrtnik ocene:', error)
    return []
  }

  return data as unknown as Ocena[]
}

/**
 * Create ocena
 */
export async function createOcena(ocena: OcenaInsert): Promise<Ocena | null> {
  const supabase = await createClient()
  
  // Check if ocena already exists for this ponudba
  const existing = await getOcenaByPonudba(ocena.ponudba_id)
  if (existing) {
    console.error('[v0] Ocena already exists for this ponudba')
    return null
  }

  const { data, error } = await supabase
    .from('ocene')
    .insert(ocena)
    .select(`
      *,
      narocnik:profiles!ocene_narocnik_id_fkey(*),
      obrtnik:obrtnik_profiles(*)
    `)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error creating ocena:', error)
    return null
  }

  const result = data as unknown as Ocena

  // Send notification to obrtnik about new review
  if (result.obrtnik_id && ocena.rating) {
    await sendNotification({
      userId: result.obrtnik_id,
      type: 'nova_ocena',
      title: 'Prejeli ste novo oceno',
      message: `Naročnik vas je ocenil z ${ocena.rating}/5 zvezdicami.`,
      link: '/obrtnik/ocene',
      metadata: { ocenaId: result.id, ponudbaId: result.ponudba_id, rating: ocena.rating }
    }).catch((err: any) => {
      console.error('[v0] Error sending notification:', err)
    })
  }

  return result
}

/**
 * Update ocena visibility
 */
export async function updateOcenaVisibility(ocenaId: string, isPublic: boolean): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('ocene')
    .update({ is_public: isPublic })
    .eq('id', ocenaId)

  if (error) {
    console.error('[v0] Error updating ocena visibility:', error)
    return false
  }

  return true
}

// getObrtnikAverageRating removed — use lib/dal/reviews.ts:getObrtnikReviewStats() instead.
// reviews.ts is the canonical source for all rating/review logic.
