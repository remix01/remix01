import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { confirmSchedulingRequest } from '@/lib/agent/scheduling/confirmAppointment'

// POST /api/agent/scheduling/confirm
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

    return confirmSchedulingRequest(req)
  } catch (error) {
    console.error('[agent/scheduling/confirm POST] error:', error)
    return NextResponse.json({ error: 'Napaka pri potrditvi termina.' }, { status: 500 })
  }
}
