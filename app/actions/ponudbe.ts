'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { acceptPonudba, updatePonudba } from '@/lib/dal/ponudbe'
import { updatePovprasevanje } from '@/lib/dal/povprasevanja'

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
      .select('id, narocnik_id')
      .eq('id', povprasevanjeId)
      .single()

    if (!povprasevanje || povprasevanje.narocnik_id !== user.id) {
      return { success: false, error: 'Nimate dostopa do tega povpraševanja' }
    }

    // Accept the ponudba
    const acceptSuccess = await acceptPonudba(ponudbaId)
    if (!acceptSuccess) {
      return { success: false, error: 'Napaka pri sprejemu ponudbe' }
    }

    // Update povprasevanje status to v_teku (in progress)
    await updatePovprasevanje(povprasevanjeId, { status: 'v_teku' })

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
