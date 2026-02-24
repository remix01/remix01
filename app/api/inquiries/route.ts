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

    // Build query with role-based access control
    let query = supabase.from('inquiries').select('*')

    if (userRole === 'admin') {
      // Admins see all inquiries
      query = query
    } else if (userRole === 'partner') {
      // Partners see inquiries (no specific partner_id in inquiries table, so they see all for now)
      // In a real scenario, you might want to add a partner_id or assigned_partners field
      query = query
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
