import { createClient } from '@/lib/supabase/server'

export interface AjpesVerificationResponse {
  isRegistered: boolean
  businessName?: string
  legalForm?: string
  status?: string
  address?: string
  error?: string
}

export interface StartVerificationResponse {
  verificationId: string | null
  status: 'auto_verified' | 'manual_review' | 'failed'
  error?: string
}

/**
 * Verify business registration via AJPES public search
 * Uses AJPES public API (no auth required)
 * Timeout: 5 seconds max
 */
export async function verifyAjpesRegistration(params: {
  ajpesId: string
  businessName: string
}): Promise<AjpesVerificationResponse> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(
      `https://www.ajpes.si/api/prs/enota?maticna=${encodeURIComponent(params.ajpesId)}`,
      {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LiftGO/1.0',
        },
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        isRegistered: false,
        error: 'AJPES nedosegljiv',
      }
    }

    const data = await response.json()

    if (!data || !data.maticna) {
      return {
        isRegistered: false,
        error: 'Podjetje ni najdeno v AJPES',
      }
    }

    return {
      isRegistered: true,
      businessName: data.naziv || data.name,
      legalForm: data.pravnaOblikaOpisa || data.legalForm,
      status: data.statusOpisa || data.status,
      address: data.naslov || data.address,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[v0] AJPES verification error:', errorMsg)
    return {
      isRegistered: false,
      error: 'AJPES nedosegljiv',
    }
  }
}

/**
 * Fuzzy match business names (case-insensitive, trim whitespace)
 */
function fuzzyMatchNames(name1: string, name2: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[,./\\-–—]/g, '')
      .replace(/\s+/g, ' ')

  const norm1 = normalize(name1)
  const norm2 = normalize(name2)

  // Exact match
  if (norm1 === norm2) return true

  // Contains match (one contains the other)
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true

  return false
}

/**
 * Start verification process for obrtnik
 */
export async function startVerification(params: {
  obrtknikId: string
  ajpesId: string
  businessName: string
}): Promise<StartVerificationResponse> {
  try {
    const supabase = await createClient()

    // Call AJPES verification
    const ajpesResult = await verifyAjpesRegistration({
      ajpesId: params.ajpesId,
      businessName: params.businessName,
    })

    // Auto-verified if registered and name matches
    if (
      ajpesResult.isRegistered &&
      ajpesResult.businessName &&
      fuzzyMatchNames(params.businessName, ajpesResult.businessName)
    ) {
      const { error: updateError } = await supabase
        .from('obrtnik_profiles')
        .update({
          is_verified: true,
          verification_status: 'verified',
          ajpes_id: params.ajpesId,
          ajpes_verified_at: new Date().toISOString(),
          ajpes_data: ajpesResult,
        })
        .eq('id', params.obrtknikId)

      if (updateError) {
        console.error('[v0] Error updating obrtnik profile:', updateError)
        return {
          verificationId: null,
          status: 'failed',
          error: 'Napaka pri posodobitvi profila',
        }
      }

      return {
        verificationId: null,
        status: 'auto_verified',
      }
    }

    // Manual review needed (name mismatch or API unreachable)
    const { data: verificationRecord, error: insertError } = await supabase
      .from('verifications')
      .insert([
        {
          obrtnik_id: params.obrtknikId,
          ajpes_id: params.ajpesId,
          ajpes_response: ajpesResult,
          status: 'pending',
        },
      ])
      .select('id')
      .single()

    if (insertError) {
      console.error('[v0] Error creating verification record:', insertError)
      return {
        verificationId: null,
        status: 'failed',
        error: 'Napaka pri pisanju v bazo',
      }
    }

    // Update obrtnik status to pending
    await supabase
      .from('obrtnik_profiles')
      .update({
        verification_status: 'pending',
        ajpes_id: params.ajpesId,
        ajpes_data: ajpesResult,
      })
      .eq('id', params.obrtknikId)

    return {
      verificationId: verificationRecord?.id || null,
      status: 'manual_review',
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[v0] Start verification error:', errorMsg)
    return {
      verificationId: null,
      status: 'failed',
      error: errorMsg,
    }
  }
}

/**
 * Manual verification by admin
 */
export async function manuallyVerifyObrtnik(params: {
  obrtknikId: string
  adminId: string
  approved: boolean
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Update obrtnik profile
    const { error: profileError } = await supabase
      .from('obrtnik_profiles')
      .update({
        is_verified: params.approved,
        verification_status: params.approved ? 'verified' : 'rejected',
      })
      .eq('id', params.obrtknikId)

    if (profileError) {
      console.error('[v0] Error updating obrtnik profile:', profileError)
      return {
        success: false,
        error: 'Napaka pri posodobitvi profila',
      }
    }

    // Log in verifications table
    const { error: logError } = await supabase
      .from('verifications')
      .update({
        status: params.approved ? 'approved' : 'rejected',
        reviewed_by: params.adminId,
        reviewed_at: new Date().toISOString(),
        notes: params.notes,
      })
      .eq('obrtnik_id', params.obrtknikId)
      .eq('status', 'pending')

    if (logError) {
      console.error('[v0] Error logging verification:', logError)
      // Don't fail if logging fails - profile update succeeded
    }

    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[v0] Manual verification error:', errorMsg)
    return {
      success: false,
      error: errorMsg,
    }
  }
}
