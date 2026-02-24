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

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isAdmin = profile?.role === 'admin'

    // Build query - admins see all, users see only their own (filtered by email)
    let query = supabase.from('inquiries').select('*')

    if (!isAdmin) {
      // Non-admins can only see inquiries they created (matched by email)
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
