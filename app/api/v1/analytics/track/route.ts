import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase/server'

const eventSchema = z.object({
  name: z.string(),
  properties: z.record(z.any()).optional(),
  sessionId: z.string(),
  timestamp: z.string().optional(),
})

const trackBodySchema = z.object({
  events: z.array(eventSchema).max(50, 'Maximum 50 events per batch'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = trackBodySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Napačna oblika podatkov', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { events } = validation.data

    // Get user ID if authenticated (optional)
    let userId: string | null = null
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      userId = user?.id || null
    } catch {
      // Not authenticated - continue with null user
    }

    // Get platform and app version from headers
    const platform = request.headers.get('x-platform') || 'web'
    const appVersion = request.headers.get('x-app-version') || null

    // Insert events
    const records = events.map((event) => ({
      user_id: userId,
      session_id: event.sessionId,
      event_name: event.name,
      properties: event.properties || {},
      platform,
      app_version: appVersion,
      created_at: event.timestamp || new Date().toISOString(),
    }))

    const { error } = await supabaseAdmin
      .from('analytics_events')
      .insert(records)

    if (error) {
      console.error('[Analytics API] Insert error:', error)
      return NextResponse.json(
        { error: 'Napaka pri shranjevanju dogodkov' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      tracked: events.length,
    })
  } catch (error) {
    console.error('[Analytics API] Track exception:', error)
    return NextResponse.json(
      { error: 'Notranja napaka strežnika' },
      { status: 500 }
    )
  }
}
