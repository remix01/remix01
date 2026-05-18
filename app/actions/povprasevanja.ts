'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  updatePovprasevanje,
  deletePovprasevanje,
  cancelPovprasevanje,
} from '@/lib/dal/povprasevanja'
import type { PovprasevanjeUpdate } from '@/types/marketplace'

/**
 * Narocnik can edit their own povprasevanje, but only if no ponudba is accepted yet.
 */
export async function updatePovprasevanjeAction(
  id: string,
  updates: PovprasevanjeUpdate
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Niste prijavljeni' }

    const { data: pov } = await supabase
      .from('povprasevanja')
      .select('id, narocnik_id, status')
      .eq('id', id)
      .maybeSingle()

    if (!pov || pov.narocnik_id !== user.id) {
      return { success: false, error: 'Nimate dostopa do tega povpraševanja' }
    }

    if (['v_teku', 'zakljuceno', 'preklicano'].includes(pov.status)) {
      return { success: false, error: 'Povpraševanja ni mogoče urejati v trenutnem stanju' }
    }

    // Block edit if a ponudba has already been accepted
    const { data: accepted } = await supabase
      .from('ponudbe')
      .select('id')
      .eq('povprasevanje_id', id)
      .eq('status', 'sprejeta')
      .limit(1)

    if (accepted && accepted.length > 0) {
      return { success: false, error: 'Povpraševanja z sprejeto ponudbo ni mogoče urejati' }
    }

    const result = await updatePovprasevanje(id, updates)
    if (!result) return { success: false, error: 'Napaka pri urejanju povpraševanja' }

    revalidatePath(`/povprasevanja/${id}`)
    revalidatePath('/povprasevanja')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('[v0] updatePovprasevanjeAction error:', error)
    return { success: false, error: 'Napaka pri urejanju povpraševanja' }
  }
}

/**
 * Narocnik can hard-delete their own povprasevanje only if no ponudbe exist.
 */
export async function deletePovprasevanjeAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Niste prijavljeni' }

    const { data: pov } = await supabase
      .from('povprasevanja')
      .select('id, narocnik_id')
      .eq('id', id)
      .maybeSingle()

    if (!pov || pov.narocnik_id !== user.id) {
      return { success: false, error: 'Nimate dostopa do tega povpraševanja' }
    }

    // DAL already guards against delete when ponudbe exist
    const deleted = await deletePovprasevanje(id)
    if (!deleted) {
      return { success: false, error: 'Povpraševanja z obstoječimi ponudbami ni mogoče izbrisati' }
    }

    revalidatePath('/povprasevanja')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('[v0] deletePovprasevanjeAction error:', error)
    return { success: false, error: 'Napaka pri brisanju povpraševanja' }
  }
}

/**
 * Narocnik can cancel (soft-delete) their own povprasevanje.
 */
export async function cancelPovprasevanjeAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Niste prijavljeni' }

    const { data: pov } = await supabase
      .from('povprasevanja')
      .select('id, narocnik_id, status')
      .eq('id', id)
      .maybeSingle()

    if (!pov || pov.narocnik_id !== user.id) {
      return { success: false, error: 'Nimate dostopa do tega povpraševanja' }
    }

    if (pov.status === 'v_teku') {
      return { success: false, error: 'Povpraševanja v teku ni mogoče preklicati' }
    }

    const result = await cancelPovprasevanje(id)
    if (!result) return { success: false, error: 'Napaka pri preklicu povpraševanja' }

    revalidatePath(`/povprasevanja/${id}`)
    revalidatePath('/povprasevanja')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('[v0] cancelPovprasevanjeAction error:', error)
    return { success: false, error: 'Napaka pri preklicu povpraševanja' }
  }
}
