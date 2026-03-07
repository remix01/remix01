import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Cron job to send pending notifications to users
 * Queries povprasevanja with status 'odprto' (open) that haven't received notifications
 * Runs periodically via Vercel Cron
 * 
 * Authorization: Requires CRON_SECRET in Bearer token
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  console.log('[notification-sweep] Starting notification sweep...')

  try {
    // Get all open povprasevanja that need notifications
    const { data: povprasevanja, error: queryError } = await supabaseAdmin
      .from('povprasevanja')
      .select('*')
      .eq('status', 'odprto')
      .is('notifikacija_poslana', false)
      .limit(50)

    if (queryError) {
      throw new Error(`Database query failed: ${queryError.message}`)
    }

    console.log(`[notification-sweep] Found ${povprasevanja?.length || 0} povprasevanja needing notifications`)

    let processed = 0
    let errors = 0

    for (const povprasevanje of povprasevanja || []) {
      try {
        // Here you could enqueue notifications via job queue or send directly
        // For now, just mark as processed
        
        const { error: updateError } = await supabaseAdmin
          .from('povprasevanja')
          .update({
            notifikacija_poslana: true,
            notifikacija_cas: new Date().toISOString(),
          })
          .eq('id', povprasevanje.id)

        if (updateError) {
          console.error(`[notification-sweep] Error marking notification sent for ${povprasevanje.id}:`, updateError)
          errors++
        } else {
          processed++
          console.log(`[notification-sweep] Processed notification for povprasevanje ${povprasevanje.id}`)
        }
      } catch (error) {
        errors++
        console.error(`[notification-sweep] Error processing povprasevanje ${povprasevanje.id}:`, error)
      }
    }

    console.log(`[notification-sweep] Completed: processed=${processed}, errors=${errors}`)

    return NextResponse.json({
      success: true,
      processed,
      errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[notification-sweep] Fatal error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
