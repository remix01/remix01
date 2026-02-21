'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updateProfile } from '@/lib/dal/profiles'
import type { ProfileUpdate } from '@/types/marketplace'

export async function updateProfileAction(
  updates: ProfileUpdate
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Niste prijavljeni' }
    }

    // Update profile
    const result = await updateProfile(user.id, updates)
    if (!result) {
      return { success: false, error: 'Napaka pri posodabljanju profila' }
    }

    // Revalidate paths
    revalidatePath('/narocnik/profil')
    revalidatePath('/narocnik/dashboard')

    return { success: true }
  } catch (error) {
    console.error('[v0] Error updating profile:', error)
    return { success: false, error: 'Napaka pri posodabljanju profila' }
  }
}
