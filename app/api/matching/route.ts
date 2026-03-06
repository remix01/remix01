'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { matchPartnersForRequest } from '@/lib/agents/matching/smartMatchingAgent'

/**
 * POST /api/matching
 * 
 * Smart matching endpoint for finding suitable partners for a service request.
 * 
 * Request body:
 * {
 *   requestId: string (UUID of povprasevanje)
 *   lat: number (latitude of request location)
 *   lng: number (longitude of request location)
 *   categoryId: string (UUID of service category)
 * }
 * 
 * Response:
 * {
 *   matches: MatchResult[] (top 5 partners, sorted by score DESC)
 *   matchingId: string | null (UUID of matching_logs record)
 *   executionTimeMs: number (how long matching took)
 *   error?: string (if any error occurred)
 * }
 * 
 * Status codes:
 * - 200: Matching completed (even if no matches found)
 * - 400: Invalid request body
 * - 401: Not authenticated
 * - 403: Not authorized to request matching for this povprasevanje
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Neveljavno telo zahtevka' },
        { status: 400 }
      )
    }

    const { requestId, lat, lng, categoryId } = body

    // Validate required fields
    if (!requestId || lat === undefined || lng === undefined || !categoryId) {
      return NextResponse.json(
        { error: 'Manjkajo obvezni parametri: requestId, lat, lng, categoryId' },
        { status: 400 }
      )
    }

    // Validate coordinate ranges
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'lat in lng morata biti številski vrednosti' },
        { status: 400 }
      )
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Neveljavne koordinate: lat [-90,90], lng [-180,180]' },
        { status: 400 }
      )
    }

    // 2. Check authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Niste prijavljeni' },
        { status: 401 }
      )
    }

    // 3. Verify user owns this povprasevanje
    const { data: povprasevanje, error: povError } = await supabase
      .from('povprasevanja')
      .select('narocnik_id')
      .eq('id', requestId)
      .single()

    if (povError || !povprasevanje) {
      return NextResponse.json(
        { error: 'Povpraševanja ni bilo mogoče naložiti' },
        { status: 404 }
      )
    }

    if (povprasevanje.narocnik_id !== user.id) {
      return NextResponse.json(
        { error: 'Nimate dostopa do tega povpraševanja' },
        { status: 403 }
      )
    }

    // 4. Run matching algorithm
    const result = await matchPartnersForRequest({
      requestId,
      lat,
      lng,
      categoryId,
    })

    // 5. Return results (even if no matches found)
    return NextResponse.json({
      matches: result.matches || [],
      matchingId: result.matchingId,
      executionTimeMs: result.executionTimeMs,
      ...(result.error && { error: result.error }),
    })
  } catch (error) {
    console.error('[v0] Matching API error:', error)
    return NextResponse.json(
      { error: 'Napaka pri iskanju obrtnov' },
      { status: 500 }
    )
  }
}
