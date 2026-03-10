/**
 * Payment Service - Extracted from app/api/payments/* routes
 * Handles payment operations and escrow
 */

import { createClient } from '@/lib/supabase/server'
import { createPaymentIntent } from '@/lib/mcp/payments'
import { ServiceError } from './serviceError'

export const paymentService = {
  /**
   * Create payment intent for a ponudba
   * Business logic extracted from POST /api/payments/create-intent
   */
  async createPaymentIntent(
    userId: string,
    ponudbaId: string,
    userEmail: string
  ) {
    const supabase = await createClient()

    // Verify user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || profile.role !== 'narocnik') {
      throw new ServiceError(
        'Unauthorized - not a narocnik',
        'FORBIDDEN',
        403
      )
    }

    // Fetch ponudba with povprasevanje
    const { data: ponudba, error: ponudbaError } = await supabase
      .from('ponudbe')
      .select(`
        *,
        povprasevanja(*)
      `)
      .eq('id', ponudbaId)
      .single()

    if (ponudbaError || !ponudba) {
      throw new ServiceError(
        'Ponudba not found',
        'NOT_FOUND',
        404
      )
    }

    // Verify ponudba status
    if (ponudba.status !== 'sprejeta') {
      throw new ServiceError(
        'Ponudba must be accepted first',
        'VALIDATION',
        400
      )
    }

    // Verify ownership - narocnik must own the povprasevanje
    const povprasevanje = ponudba.povprasevanja
    if (povprasevanje.narocnik_id !== userId) {
      throw new ServiceError(
        'Unauthorized - not the povprasevanje owner',
        'FORBIDDEN',
        403
      )
    }

    // Create payment intent
    const amount = Math.round((ponudba.price_estimate || 0) * 100)
    const result = await createPaymentIntent({
      amount,
      povprasevanjeId: ponudba.povprasevanja_id,
      ponudbaId,
      narocnikEmail: userEmail,
    })

    if (result.error) {
      throw new ServiceError(
        result.error,
        'DB_ERROR',
        500
      )
    }

    return {
      clientSecret: result.clientSecret,
      amount,
      currency: 'eur',
    }
  },
}
