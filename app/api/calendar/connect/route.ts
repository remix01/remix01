import { getCalendarAuthUrl } from '@/lib/mcp/calendar'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Determine user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role === 'narocnik' ? 'narocnik' : 'obrtnik'

    const { url } = await getCalendarAuthUrl(user.id, role)

    return NextResponse.json({ url })
  } catch (error) {
    console.error('[v0] Calendar auth URL error:', error)
    return NextResponse.json(
      { error: 'Failed to generate calendar auth URL' },
      { status: 500 }
    )
  }
}
