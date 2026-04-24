import { getCalendarAuthUrl } from '@/lib/mcp/calendar'
import { createClient } from '@/lib/supabase/server'
import { ok, fail } from '@/lib/http/response'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return fail('Unauthorized', 401)
    }

    // Determine user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role === 'narocnik' ? 'narocnik' : 'obrtnik'

    const { url } = await getCalendarAuthUrl(user.id, role)

    return ok({ url })
  } catch (error) {
    console.error('[v0] Calendar auth URL error:', error)
    return fail('Failed to generate calendar auth URL', 500)
  }
}
