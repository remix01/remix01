'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { acceptPonudbaFull, updatePonudba } from '@/lib/dal/ponudbe'
import { createAppointmentEvent } from '@/lib/mcp/calendar'
import { trackFunnelEvent, FUNNEL_EVENTS } from '@/lib/analytics/funnel'

export async function acceptPonudbaAction(
  ponudbaId: string,
  povprasevanjeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Niste prijavljeni' }

    // Delegate to DAL — handles auth, rejects other ponudbe, updates povprasevanje
    const accepted = await acceptPonudbaFull(ponudbaId, povprasevanjeId, user.id)

    // Calendar appointment (non-blocking)
    if ((accepted as any).available_date && accepted.obrtnik_id) {
      const startDateTime = new Date((accepted as any).available_date)
      startDateTime.setHours(9, 0, 0)
      const endDateTime = new Date((accepted as any).available_date)
      endDateTime.setHours(11, 0, 0)

      createAppointmentEvent({
        narocnikId: user.id,
<<<<<<< Updated upstream
        obrtknikId: accepted.obrtnik_id,
        title: accepted.povprasevanje?.title ?? '',
        description: accepted.povprasevanje?.description ?? '',
        locationCity: (accepted.povprasevanje as any)?.location_city ?? '',
=======
        obrtknikId: ponudbaData.obrtnik_id,
        title: povprasevanje.title,
        description: povprasevanje.description ?? '',
        locationCity: povprasevanje.location_city ?? '',
>>>>>>> Stashed changes
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        ponudbaId,
      }).catch(err => console.error('[v0] Calendar appointment error:', err))
    }

    trackFunnelEvent(FUNNEL_EVENTS.PONUDBA_ACCEPTED, {
      povprasevanje_id: povprasevanjeId,
      category: (accepted.povprasevanje as any)?.category_id ?? null,
      location: (accepted.povprasevanje as any)?.location_city ?? null,
      user_type: 'narocnik',
      obrtnik_id: accepted.obrtnik_id ?? undefined,
    }, user.id)

    revalidatePath(`/povprasevanja/${povprasevanjeId}`)
    revalidatePath('/povprasevanja')
    revalidatePath('/dashboard')
    revalidatePath('/partner-dashboard')
    revalidatePath('/admin/povprasevanja')

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Napaka pri sprejemu ponudbe'
    console.error('[v0] acceptPonudbaAction error:', error)
    return { success: false, error: msg }
  }
}

/**
 * Obrtnik withdraws (removes) their own pending ponudba.
 */
export async function withdrawPonudbaAction(
  ponudbaId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Niste prijavljeni' }

    // Verify ownership and status
    const { data: ponudba } = await supabase
      .from('ponudbe')
      .select('id, obrtnik_id, status, povprasevanje_id')
      .eq('id', ponudbaId)
      .maybeSingle()

    if (!ponudba || ponudba.obrtnik_id !== user.id) {
      return { success: false, error: 'Nimate dostopa do te ponudbe' }
    }

    if (ponudba.status === 'sprejeta') {
      return { success: false, error: 'Sprejete ponudbe ni mogoče umakniti' }
    }

    const result = await updatePonudba(ponudbaId, { status: 'zavrnjena' })
    if (!result) return { success: false, error: 'Napaka pri umiku ponudbe' }

    revalidatePath('/partner-dashboard')
    revalidatePath('/partner-dashboard/ponudbe')
    revalidatePath(`/povprasevanja/${ponudba.povprasevanje_id}`)
    revalidatePath('/dashboard')
    revalidatePath('/admin/ponudbe')
    revalidatePath('/admin/povprasevanja')

    return { success: true }
  } catch (error) {
    console.error('[v0] withdrawPonudbaAction error:', error)
    return { success: false, error: 'Napaka pri umiku ponudbe' }
  }
}

/**
 * Obrtnik edits their own pending ponudba (message, price, date).
 */
export async function updatePonudbaAction(
  ponudbaId: string,
  updates: { message?: string; price_estimate?: number; available_date?: string | null | undefined }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Niste prijavljeni' }

    // Verify ownership
    const { data: existing } = await supabase
      .from('ponudbe')
      .select('id, obrtnik_id, status, povprasevanje_id')
      .eq('id', ponudbaId)
      .maybeSingle()

    if (!existing || existing.obrtnik_id !== user.id) {
      return { success: false, error: 'Nimate dostopa do te ponudbe' }
    }

    if (existing.status === 'sprejeta') {
      return { success: false, error: 'Sprejete ponudbe ni mogoče urejati' }
    }

    const result = await updatePonudba(ponudbaId, updates)
    if (!result) return { success: false, error: 'Napaka pri urejanju ponudbe' }

    revalidatePath('/partner-dashboard')
    revalidatePath('/partner-dashboard/ponudbe')
    revalidatePath(`/povprasevanja/${existing.povprasevanje_id}`)
    revalidatePath('/dashboard')
    revalidatePath('/admin/ponudbe')
    revalidatePath('/admin/povprasevanja')

    return { success: true }
  } catch (error) {
    console.error('[v0] updatePonudbaAction error:', error)
    return { success: false, error: 'Napaka pri urejanju ponudbe' }
  }
}
