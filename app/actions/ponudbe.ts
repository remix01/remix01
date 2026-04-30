'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { acceptPonudba, updatePonudba } from '@/lib/dal/ponudbe'
import { updatePovprasevanje } from '@/lib/dal/povprasevanja'
import { createAppointmentEvent } from '@/lib/mcp/calendar'
import { trackFunnelEvent, FUNNEL_EVENTS } from '@/lib/analytics/funnel'

export async function acceptPonudbaAction(
  ponudbaId: string,
  povprasevanjeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Niste prijavljeni' }
    }

    // Verify povprasevanje exists and belongs to user
    const { data: povprasevanje } = await supabase
      .from('povprasevanja')
      .select('id, narocnik_id, title, description, location_city, category_id')
      .eq('id', povprasevanjeId)
      .maybeSingle()

    if (!povprasevanje || povprasevanje.narocnik_id !== user.id) {
      return { success: false, error: 'Nimate dostopa do tega povpraševanja' }
    }

    // Fetch ponudba details (with obrtnik_id for notifications)
    const { data: ponudbaData } = await supabase
      .from('ponudbe')
      .select('*')
      .eq('id', ponudbaId)
      .maybeSingle()

    if (!ponudbaData) {
      return { success: false, error: 'Ponudba ni najdena' }
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 1: UPDATE the accepted ponudba SET status='sprejeta', accepted_at=now()
    // ════════════════════════════════════════════════════════════════════
    const { error: acceptError } = await supabase
      .from('ponudbe')
      .update({ 
        status: 'sprejeta',
        accepted_at: new Date().toISOString()
      })
      .eq('id', ponudbaId)

    if (acceptError) {
      console.error('[v0] Error accepting ponudba:', acceptError)
      return { success: false, error: 'Napaka pri sprejemu ponudbe' }
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 2: REJECT all other pending ponudbe for this povprasevanje
    // ════════════════════════════════════════════════════════════════════
    const { error: rejectError } = await supabase
      .from('ponudbe')
      .update({ status: 'zavrnjena' })
      .eq('povprasevanje_id', povprasevanjeId)
      .neq('id', ponudbaId)
      .eq('status', 'poslana')

    if (rejectError) {
      console.error('[v0] Error rejecting other ponudbe:', rejectError)
      // Don't fail the whole action if rejection fails
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 3: UPDATE povprasevanje status to 'v_teku' and set obrtnik_id
    // ════════════════════════════════════════════════════════════════════
    const { error: updatePovError } = await supabase
      .from('povprasevanja')
      .update({ 
        status: 'v_teku',
        obrtnik_id: ponudbaData.obrtnik_id
      })
      .eq('id', povprasevanjeId)

    if (updatePovError) {
      console.error('[v0] Error updating povprasevanje:', updatePovError)
      return { success: false, error: 'Napaka pri posodobitvi povpraševanja' }
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 4: INSERT notification for obrtnik
    // ════════════════════════════════════════════════════════════════════
    if (ponudbaData.obrtnik_id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: ponudbaData.obrtnik_id,
          type: 'ponudba_sprejeta',
          title: 'Vaša ponudba je bila sprejeta! 🎉',
          body: 'Stranka je sprejela vašo ponudbo. Dogovorite se za termin z naročnikom.',
          message: 'Stranka je sprejela vašo ponudbo. Dogovorite se za termin z naročnikom.',
          link: '/obrtnik/ponudbe',
          is_read: false,
        })
        .then(({ error }) => {
          if (error) console.error('[v0] Error sending notification:', error)
        })
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 5: Calendar appointment (if available_date exists)
    // ════════════════════════════════════════════════════════════════════
    if (ponudbaData?.available_date && ponudbaData?.obrtnik_id) {
      const startDateTime = new Date(ponudbaData.available_date)
      startDateTime.setHours(9, 0, 0)
      const endDateTime = new Date(ponudbaData.available_date)
      endDateTime.setHours(11, 0, 0)

      await createAppointmentEvent({
        narocnikId: user.id,
        obrtknikId: ponudbaData.obrtnik_id,
        title: povprasevanje.title,
        description: povprasevanje.description,
        locationCity: povprasevanje.location_city,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        ponudbaId
      }).catch(err => {
        console.error('[v0] Calendar appointment creation error:', err)
        // Don't fail the whole action if calendar fails
      })
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 6: Analytics + revalidate paths
    // ════════════════════════════════════════════════════════════════════
    trackFunnelEvent(FUNNEL_EVENTS.PONUDBA_ACCEPTED, {
      povprasevanje_id: povprasevanjeId,
      category: (povprasevanje as { category_id?: string }).category_id ?? null,
      location: povprasevanje.location_city ?? null,
      user_type: 'narocnik',
      obrtnik_id: ponudbaData.obrtnik_id ?? undefined,
    }, user.id)

    revalidatePath(`/povprasevanja/${povprasevanjeId}`)
    revalidatePath('/povprasevanja')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('[v0] Error accepting ponudba:', error)
    return { success: false, error: 'Napaka pri sprejemu ponudbe' }
  }
}
