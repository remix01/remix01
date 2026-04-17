import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[Auth logout] signOut error:', error)
      return NextResponse.json({ error: 'Odjava ni uspela.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Auth logout] unexpected error:', error)
    return NextResponse.json({ error: 'Prišlo je do napake pri odjavi.' }, { status: 500 })
  }
}
