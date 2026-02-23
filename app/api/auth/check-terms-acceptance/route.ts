import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const CURRENT_TOS_VERSION = '2026-02-v1'
const NINETY_DAYS_IN_MS = 90 * 24 * 60 * 60 * 1000

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ shouldShowModal: false })
    }

    // Get user from database
    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('user')
      .select('role, tos_accepted_at, tos_version, craftworker_agreement_accepted_at')
      .eq('id', user.id)
      .single()

    if (userError || !dbUser || dbUser.role !== 'CRAFTWORKER') {
      return NextResponse.json({ shouldShowModal: false })
    }

    // Check if craftworker has accepted current terms
    const hasAcceptedCurrentTerms = 
      dbUser.tos_version === CURRENT_TOS_VERSION &&
      dbUser.craftworker_agreement_accepted_at !== null

    if (hasAcceptedCurrentTerms) {
      return NextResponse.json({ shouldShowModal: false })
    }

    // Check if last acceptance was more than 90 days ago
    const shouldShow = 
      !dbUser.craftworker_agreement_accepted_at ||
      Date.now() - new Date(dbUser.craftworker_agreement_accepted_at).getTime() > NINETY_DAYS_IN_MS

    return NextResponse.json({ shouldShowModal: shouldShow })
  } catch (error) {
    console.error('[check-terms-acceptance] Error:', error)
    return NextResponse.json({ shouldShowModal: false })
  }
}
