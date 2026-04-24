'use server'

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { matchingService, handleServiceError } from '@/lib/services'
import { withRateLimit } from '@/lib/rate-limit/with-rate-limit'
import { apiLimiter } from '@/lib/rate-limit/limiters'
import { z } from 'zod'
import { ok, fail } from '@/lib/http/response'

const matchingBodySchema = z.object({
  requestId: z.string().uuid('requestId mora biti veljavni UUID'),
  lat: z.number().min(-90).max(90, 'lat mora biti med -90 in 90'),
  lng: z.number().min(-180).max(180, 'lng mora biti med -180 in 180'),
  categoryId: z.string().uuid('categoryId mora biti veljavni UUID'),
})

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
async function postHandler(request: NextRequest, _context: { params: Promise<unknown> }) {
  try {
    // Parse request body
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return fail('Neveljavno telo zahtevka', 400)
    }

    // Validate with Zod
    const parsed = matchingBodySchema.safeParse(rawBody)
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(', ')
      return fail(message, 400)
    }

    const { requestId, lat, lng, categoryId } = parsed.data

    // Check authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return fail('Niste prijavljeni', 401)
    }

    // Delegate to service layer
    const result = await matchingService.findMatches(
      requestId,
      lat,
      lng,
      categoryId,
      user.id
    )

    // Return results
    return ok({
      matches: result.matches || [],
      matchingId: result.matchingId,
      executionTimeMs: result.executionTimeMs,
      ...(result.error && { error: result.error }),
    })
  } catch (error) {
    console.error('[v0] Matching API error:', error)
    return handleServiceError(error)
  }
}

export const POST = withRateLimit(apiLimiter, postHandler)
