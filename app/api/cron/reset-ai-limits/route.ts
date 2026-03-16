import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const maxDuration = 30

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error, count } = await supabaseAdmin
    .from('profiles')
    .update({
      ai_messages_used_today: 0,
      ai_messages_reset_at: new Date().toISOString(),
    })
    .lt('ai_messages_reset_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .select('id', { count: 'exact', head: true })

  if (error) {
    console.error('[CRON reset-ai-limits]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[CRON reset-ai-limits] Reset ${count ?? 0} profiles`)
  return NextResponse.json({ reset: count ?? 0 })
}
