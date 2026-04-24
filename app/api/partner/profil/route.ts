import { getPartner } from '@/lib/supabase-partner'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, fail } from '@/lib/http/response'

/**
 * GET — partner profile
 */
export async function GET() {
  const partner = await getPartner()
  if (!partner) return fail('Unauthorized', 401)
  return Response.json(partner)
}

/**
 * PATCH — update partner profile
 */
export async function PATCH(req: Request) {
  const partner = await getPartner()
  if (!partner) return fail('Unauthorized', 401)

  const body = await req.json()
  const allowed = ['telefon', 'bio', 'specialnosti', 'lokacije',
                   'cena_min', 'cena_max', 'leta_izkusenj', 'podjetje']
  const updates: Record<string, unknown> = {}
  allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k] })

  const { data, error } = await supabaseAdmin
    .from('partners')
    .update(updates)
    .eq('user_id', partner.user_id)
    .select()
    .single()

  if (error) return fail(error.message, 500)
  return Response.json(data)
}
