import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase/server'

export interface CanonicalPartner {
  userId: string
  partnerId: string
  profile: {
    id: string
    business_name: string
    description: string | null
    subscription_tier: 'start' | 'pro' | 'elite' | null
    stripe_customer_id: string | null
    is_verified: boolean
    avg_rating: number
    hourly_rate: number | null
    years_experience: number | null
    tagline: string | null
    website_url: string | null
    facebook_url: string | null
    instagram_url: string | null
    service_radius_km: number | null
  }
}

const PROFILE_SELECT =
  'id, business_name, description, subscription_tier, stripe_customer_id, is_verified, avg_rating, hourly_rate, years_experience, tagline, website_url, facebook_url, instagram_url, service_radius_km'

/**
 * Resolves canonical partner identity from a Supabase auth user ID.
 *
 * Resolution order (per spec section 1):
 *   1. obrtnik_profiles.id = userId  (canonical — same UUID as auth.uid())
 *   2. obrtnik_profiles.user_id = userId  (legacy column fallback)
 *
 * Emits a structured warning on fallback so migrations can be tracked.
 * Returns null if no partner profile is found.
 */
export async function resolveCanonicalPartnerId(userId: string): Promise<CanonicalPartner | null> {
  // Step 1: canonical path — id IS the auth UUID
  const { data: byId } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle()

  if (byId) {
    return { userId, partnerId: byId.id, profile: byId as CanonicalPartner['profile'] }
  }

  // Step 2: legacy fallback — user_id column (not in generated types but present in DB)
  const { data: byUserId } = await (supabaseAdmin as any)
    .from('obrtnik_profiles')
    .select(PROFILE_SELECT)
    .eq('user_id', userId)
    .maybeSingle()

  if (byUserId) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        code: 'PARTNER_ID_MAPPING_FALLBACK',
        path: 'obrtnik_profiles.user_id',
        userId,
        partnerId: byUserId.id,
        message: 'Resolved via legacy user_id column — migrate row to canonical id path',
      })
    )
    return { userId, partnerId: byUserId.id, profile: byUserId as CanonicalPartner['profile'] }
  }

  return null
}

/**
 * Authenticates the current request and resolves canonical partner identity.
 * Returns null when unauthenticated or when no obrtnik_profiles row exists.
 */
export async function getAuthenticatedPartner(): Promise<CanonicalPartner | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return resolveCanonicalPartnerId(user.id)
}
