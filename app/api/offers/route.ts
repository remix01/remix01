import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { offerService, handleServiceError } from '@/lib/services'
import { ok, fail } from '@/lib/http/response'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return fail('Unauthorized', 401)
    }

    // Check user's role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const userRole = profile?.role

    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id') || undefined

    // Delegate to service layer
    const offers = await offerService.getOffers(user.id, userRole, partnerId)

    return ok({ success: true, data: offers })
  } catch (error: unknown) {
    console.error('[API] Error fetching offers:', error)
    return handleServiceError(error)
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return fail('Unauthorized', 401)
    }

    const body = await request.json()

    // Delegate to service layer
    const offer = await offerService.createOffer(user.id, body)

    return ok({ success: true, data: offer })
  } catch (error: unknown) {
    console.error('[API] Error creating offer:', error)
    return handleServiceError(error)
  }
}
