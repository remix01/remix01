'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createPovprasevanje } from '@/lib/dal/povprasevanja'
import type { PovprasevanjeInsert } from '@/types/marketplace'

export async function createPovprasevanjeAction(
  data: PovprasevanjeInsert
): Promise<{ id: string } | { error: string }> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Niste prijavljeni' }
    }

    // Ensure the narocnik_id is always the authenticated user (security)
    const povprasevanje: PovprasevanjeInsert = {
      ...data,
      narocnik_id: user.id,
    }

    const result = await createPovprasevanje(povprasevanje)
    if (!result) {
      return { error: 'Napaka pri oddaji. Poskusite znova.' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/povprasevanja')

    return { id: result.id }
  } catch (err) {
    console.error('[action] createPovprasevanje error:', err)
    return { error: 'Napaka pri oddaji. Poskusite znova.' }
  }
}
