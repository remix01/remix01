import { createClient } from '@/lib/supabase/server'

export interface MigrationResult {
  success: boolean
  newProfileId?: string
  error?: string
}

/**
 * Migrate a partner from the old system to the new obrtnik_profiles system.
 * 
 * Process:
 * 1. Fetch partner from partners table
 * 2. Check if auth user exists for this partner email
 * 3. Create profiles record with auth_user_id and set role='obrtnik'
 * 4. Create obrtnik_profiles record linked to new profile
 * 5. Link old partner: UPDATE partners SET new_profile_id = newProfileId
 * 6. Return success with new profile ID
 */
export async function migratePartnerToNewSystem(
  partnerId: string
): Promise<MigrationResult> {
  try {
    const supabase = await createClient()

    // Step 1: Fetch partner from old system
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .single()

    if (partnerError || !partner) {
      return {
        success: false,
        error: `Partner not found: ${partnerError?.message || 'Unknown error'}`
      }
    }

    // Step 2: Check if auth user exists for this partner
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers()
    
    const authUser = authUsers?.find(u => u.email === partner.email)
    
    if (!authUser) {
      return {
        success: false,
        error: `No auth user found for email: ${partner.email}`
      }
    }

    // Step 3: Create profiles record if doesn't exist
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single()

    let profileId = existingProfile?.id

    if (!existingProfile) {
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          auth_user_id: authUser.id,
          full_name: partner.business_name,
          email: partner.email,
          role: 'obrtnik',
          location_city: partner.city || null
        })
        .select('id')
        .single()

      if (profileError || !newProfile) {
        return {
          success: false,
          error: `Failed to create profile: ${profileError?.message}`
        }
      }

      profileId = newProfile.id
    }

    // Step 4: Create obrtnik_profiles record if doesn't exist
    const { data: existingObrtnik } = await supabase
      .from('obrtnik_profiles')
      .select('id')
      .eq('id', profileId)
      .single()

    if (!existingObrtnik) {
      const { error: obrtnikError } = await supabase
        .from('obrtnik_profiles')
        .insert({
          id: profileId,
          business_name: partner.business_name,
          avg_rating: partner.rating || 0,
          is_verified: partner.is_verified || false,
          created_at: new Date().toISOString()
        })

      if (obrtnikError) {
        return {
          success: false,
          error: `Failed to create obrtnik profile: ${obrtnikError.message}`
        }
      }
    }

    // Step 5: Link old partner to new profile
    const { error: linkError } = await supabase
      .from('partners')
      .update({
        new_profile_id: profileId,
        migrated_at: new Date().toISOString()
      })
      .eq('id', partnerId)

    if (linkError) {
      return {
        success: false,
        error: `Failed to link partner to new profile: ${linkError.message}`
      }
    }

    return {
      success: true,
      newProfileId: profileId
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during migration'
    }
  }
}

/**
 * Migrate all non-migrated partners in batches
 */
export async function migrateAllPartners(batchSize = 50): Promise<{
  total: number
  successful: number
  failed: number
  errors: Array<{ partnerId: string; error: string }>
}> {
  try {
    const supabase = await createClient()

    // Fetch all non-migrated partners
    const { data: partners, error } = await supabase
      .from('partners')
      .select('id')
      .is('new_profile_id', null)
      .limit(batchSize)

    if (error) {
      throw new Error(`Failed to fetch partners: ${error.message}`)
    }

    const results = {
      total: partners?.length || 0,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ partnerId: string; error: string }>
    }

    if (!partners || partners.length === 0) {
      return results
    }

    // Migrate each partner
    for (const partner of partners) {
      const result = await migratePartnerToNewSystem(partner.id)
      
      if (result.success) {
        results.successful++
      } else {
        results.failed++
        results.errors.push({
          partnerId: partner.id,
          error: result.error || 'Unknown error'
        })
      }
    }

    return results
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Unknown error during batch migration'
    )
  }
}
