import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser, sendPushToObrtnikiByCategory } from '@/lib/push-notifications'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, aktiven')
      .eq('auth_user_id', user.id)
      .single()

    if (!adminUser || !adminUser.aktiven) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse request body
    const { userId, categoryId, title, message, link } = await request.json()

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message required' }, { status: 400 })
    }

    let result

    if (userId) {
      // Send to specific user
      result = await sendPushToUser({
        userId,
        title,
        message,
        link
      })
      return NextResponse.json({ sent: result.sent, failed: result.failed })
    } else if (categoryId) {
      // Send to obrtniki in category
      result = await sendPushToObrtnikiByCategory({
        categoryId,
        title,
        message,
        link: link || '/obrtnik/povprasevanja'
      })
      return NextResponse.json({ sent: result.sent })
    } else {
      return NextResponse.json({ error: 'Either userId or categoryId required' }, { status: 400 })
    }
  } catch (error) {
    console.error('[v0] Error in push send:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
