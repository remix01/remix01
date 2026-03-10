/**
 * Matching Service - Extracted from app/api/matching/route.ts
 * Handles smart matching algorithm and matching operations
 */

import { createClient } from '@/lib/supabase/server'
import { matchPartnersForRequest } from '@/lib/agents/matching/smartMatchingAgent'
import { ServiceError } from './serviceError'

export const matchingService = {
  /**
   * Find matches for a service request
   * Business logic extracted from POST /api/matching
   */
  async findMatches(
    requestId: string,
    lat: number,
    lng: number,
    categoryId: string,
    userId: string
  ) {
    // Verify user owns this povprasevanje
    const supabase = await createClient()
    const { data: povprasevanje, error: povError } = await supabase
      .from('povprasevanja')
      .select('narocnik_id')
      .eq('id', requestId)
      .single()

    if (povError || !povprasevanje) {
      throw new ServiceError(
        'Povpraševanja ni bilo mogoče naložiti',
        'NOT_FOUND',
        404
      )
    }

    if (povprasevanje.narocnik_id !== userId) {
      throw new ServiceError(
        'Nimate dostopa do tega povpraševanja',
        'FORBIDDEN',
        403
      )
    }

    // Run matching algorithm
    const result = await matchPartnersForRequest({
      requestId,
      lat,
      lng,
      categoryId,
    })

    return {
      matches: result.matches || [],
      matchingId: result.matchingId,
      executionTimeMs: result.executionTimeMs,
      ...(result.error && { error: result.error }),
    }
  },
}

