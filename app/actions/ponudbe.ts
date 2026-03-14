'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAppointmentEvent } from '@/lib/mcp/calendar'

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

    // Verify povprasevanje belongs to user
    const { data: povprasevanje } = await supabase
      .from('povprasevanja')
      .select('id, narocnik_id, title, description, location_city, category_id')
      .eq('id', povprasevanjeId)
      .maybeSingle()

    if (!povprasevanje || povprasevanje.narocnik_id !== user.id) {
      return { success: false, error: 'Nimate dostopa do tega povpraševanja' }
    }

    // STEP 1: Fetch ponudba details
    const { data: ponudbaData } = await supabase
      .from('ponudbe')
      .select('*, obrtnik:obrtnik_profiles(id)')
      .eq('id', ponudbaId)
      .maybeSingle()

    if (!ponudbaData) {
      return { success: false, error: 'Ponudba ni najdena' }
    }

    // STEP 1: Update this ponudba to 'sprejeta' with accepted_at timestamp
    const { error: acceptError } = await supabase
      .from('ponudbe')
      .update({ status: 'sprejeta', accepted_at: new Date().toISOString() })
      .eq('id', ponudbaId)

    if (acceptError) {
      console.error('[v0] Error accepting ponudba:', acceptError)
      return { success: false, error: 'Napaka pri sprejemu ponudbe' }
    }

    // STEP 2: Reject all other pending ponudbe for this povprasevanje
    const { error: rejectError } = await supabase
      .from('ponudbe')
      .update({ status: 'zavrnjena' })
      .eq('povprasevanje_id', povprasevanjeId)
      .eq('status', 'poslana')
      .neq('id', ponudbaId)

    if (rejectError) {
      console.error('[v0] Error rejecting other ponudbe:', rejectError)
      // Don't fail the action if rejection of other ponudbe fails
    }

    // STEP 3: Update povprasevanje status to 'v_teku' and set obrtnik_id
    const { error: povError } = await supabase
      .from('povprasevanja')
      .update({ 
        status: 'v_teku',
        obrtnik_id: ponudbaData.obrtnik_id
      })
      .eq('id', povprasevanjeId)

    if (povError) {
      console.error('[v0] Error updating povprasevanje:', povError)
      // Don't fail the action if povprasevanje update fails
    }

    // STEP 4: Send notification to obrtnik
    if (ponudbaData.obrtnik_id) {
      try {
        await supabase
          .from('notifications')
          .insert({
            user_id: ponudbaData.obrtnik_id,
            type: 'ponudba_sprejeta',
            title: 'Vaša ponudba je bila sprejeta!',
            message: 'Stranka je sprejela vašo ponudbo za ' + povprasevanje.title,
            action_url: '/obrtnik/ponudbe',
            is_read: false
          })
      } catch (err) {
        console.error('[v0] Error sending notification:', err)
        // Don't fail the action if notification fails
      }
    }

    // If ponudba has available_date, create calendar appointment
    if (ponudbaData?.available_date && ponudbaData?.obrtnik?.id) {
      const startDateTime = new Date(ponudbaData.available_date)
      startDateTime.setHours(9, 0, 0)
      const endDateTime = new Date(ponudbaData.available_date)
      endDateTime.setHours(11, 0, 0)

      await createAppointmentEvent({
        narocnikId: user.id,
        obrtknikId: ponudbaData.obrtnik.id,
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

    // STEP 5: Revalidate paths
    revalidatePath(`/narocnik/povprasevanja/${povprasevanjeId}`)
    revalidatePath('/narocnik/povprasevanja')
    revalidatePath('/narocnik/dashboard')

    return { success: true }
  } catch (error) {
    console.error('[v0] Error accepting ponudba:', error)
    return { success: false, error: 'Napaka pri sprejemu ponudbe' }
  }
}
