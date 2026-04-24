import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
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

    // Build query with ownership-based access control
    let query = supabase.from('inquiries').select('*')

    if (userRole === 'admin') {
      // Admins see all inquiries
      // No filter applied
    } else if (userRole === 'partner') {
      // Partners see all inquiries (they can respond to any inquiry)
      // No filter applied for now - partners can browse all available inquiries
    } else {
      // Regular users only see their own inquiries (matched by email)
      if (!user.email) {
        return fail('User email not found', 400)
      }
      query = query.eq('email', user.email)
    }

    const { data: inquiries, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return fail(error.message, 500)
    }

    return ok({ success: true, data: inquiries })
  } catch (error) {
    console.error('[API] Error fetching inquiries:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return fail(message, 500)
  }
}
