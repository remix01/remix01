/**
 * Admin API — Health Status
 * 
 * Returns real-time system health snapshot.
 * Admin-only access (role = 'ADMIN').
 */

import { NextRequest, NextResponse } from 'next/server'
import { metrics } from '@/lib/monitoring/metrics'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  // Verify admin role
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.slice(7)

  try {
    const supabase = createAdminClient()
    
    // Verify JWT and check admin role
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role from user table
    const { data: dbUser, error: userError } = await supabase
      .from('user')
      .select('id, role')
      .eq('email', user.email!)
      .single()

    if (userError || !dbUser || dbUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    // Get health snapshot
    const snapshot = await metrics.getSnapshot()
    return NextResponse.json(snapshot)
  } catch (err) {
    console.error('[API] Health endpoint error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
