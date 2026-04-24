import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { analyticsTrackBodySchema } from '@/lib/api/schemas/v1'
import { ok, fail } from '@/lib/http/response'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = analyticsTrackBodySchema.safeParse(body)

    if (!validation.success) {
      return fail('Napačna oblika podatkov', 400, { details: validation.error.issues })
    }

    const { events } = validation.data

    // Get user ID if authenticated (optional)
    let userId: string | null = null
    try {
      const supabase = await createServerClient()
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
      return fail('Napaka pri shranjevanju dogodkov', 500)
    }

    return ok({
      success: true,
      tracked: events.length,
    })
  } catch (error) {
    console.error('[Analytics API] Track exception:', error)
    return fail('Notranja napaka strežnika', 500)
  }
}
