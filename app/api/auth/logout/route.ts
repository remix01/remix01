import { createClient } from '@/lib/supabase/server'
import { ok, fail } from '@/lib/http/response'

export async function POST() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[Auth logout] signOut error:', error)
      return fail('Odjava ni uspela.', 500)
    }

    return ok({ success: true })
  } catch (error) {
    console.error('[Auth logout] unexpected error:', error)
    return fail('Prišlo je do napake pri odjavi.', 500)
  }
}
