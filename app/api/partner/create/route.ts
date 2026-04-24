import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, fail } from '@/lib/http/response'

/**
 * POST — create a new partner record after signup
 */
export async function POST(req: Request) {
  try {
    const { user_id, company_name, email } = await req.json()

    if (!user_id || !company_name) {
      return fail('Missing required fields', 400)
    }

    // Create partner record linked to the authenticated user
    const { data, error } = await supabaseAdmin
      .from('partners')
      .insert({
        user_id,
        podjetje: company_name,
        email,
        aktiven: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[v0] Partner creation error:', error)
      return fail(error.message, 500)
    }

    return Response.json(data, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating partner:', error)
    return fail('Internal server error', 500)
  }
}
