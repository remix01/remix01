import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase/server'

type Action = 'suspend' | 'unsuspend'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: admin, error: adminError } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('aktiven', true)
    .maybeSingle()

  if (adminError || !admin) return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })

  const body = await request.json() as { ids?: string[]; action?: Action }
  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : []
  if (!ids.length || !body.action) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const update = body.action === 'suspend'
    ? { is_suspended: true, suspended_at: new Date().toISOString(), suspended_reason: 'Bulk admin action' }
    : { is_suspended: false, suspended_at: null, suspended_reason: null }

  const { error } = await supabaseAdmin.from('craftworker_profile').update(update).in('user_id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  console.log(`[admin][bulk-${body.action}] ids=${ids.length} admin=${admin.id}`)
  return NextResponse.json({ success: true, count: ids.length })
}

