import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
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
        return NextResponse.json({ success: false, error: 'User email not found' }, { status: 400 })
      }
      query = query.eq('email', user.email)
    }

    const { data: inquiries, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: inquiries })
  } catch (error: any) {
    console.error('[API] Error fetching inquiries:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
