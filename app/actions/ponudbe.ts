'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { acceptPonudba, updatePonudba } from '@/lib/dal/ponudbe'
import { updatePovprasevanje } from '@/lib/dal/povprasevanja'
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

    // Verify ponudba exists and povprasevanje belongs to user
    const { data: povprasevanje } = await supabase
      .from('povprasevanja')
      .select('id, narocnik_id, title, description, location_city, category_id')
      .eq('id', povprasevanjeId)
      .single()

    if (!povprasevanje || povprasevanje.narocnik_id !== user.id) {
      return { success: false, error: 'Nimate dostopa do tega povpraševanja' }
    }

    // Fetch ponudba details
    const { data: ponudbaData } = await supabase
      .from('ponudbe')
      .select('*, obrtnik:obrtnik_profiles(id)')
      .eq('id', ponudbaId)
      .single()

    // Accept the ponudba
    const acceptSuccess = await acceptPonudba(ponudbaId)
    if (!acceptSuccess) {
      return { success: false, error: 'Napaka pri sprejemu ponudbe' }
    }

    // Update povprasevanje status to v_teku (in progress)
    await updatePovprasevanje(povprasevanjeId, { status: 'v_teku' })

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

    // Revalidate the page
    revalidatePath(`/narocnik/povprasevanja/${povprasevanjeId}`)
    revalidatePath('/narocnik/povprasevanja')
    revalidatePath('/narocnik/dashboard')

    return { success: true }
  } catch (error) {
    console.error('[v0] Error accepting ponudba:', error)
    return { success: false, error: 'Napaka pri sprejemu ponudbe' }
  }
}
