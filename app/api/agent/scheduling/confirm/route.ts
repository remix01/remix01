import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { confirmSchedulingRequest } from '@/lib/agent/scheduling/confirmAppointment'
import { ok, fail } from '@/lib/http/response'

// POST /api/agent/scheduling/confirm
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('Nepooblaščen dostop.', 401)

    return confirmSchedulingRequest(req)
  } catch (error) {
    console.error('[agent/scheduling/confirm POST] error:', error)
    return fail('Napaka pri potrditvi termina.', 500)
  }
}
