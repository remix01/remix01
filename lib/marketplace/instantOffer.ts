/**
 * Instant Offer Generator
 * 
 * Auto-generates offer drafts for PRO plan partners with instant offers enabled.
 * Only used for PRO partners (not sent automatically, requires partner confirmation).
 * Pulls from partner's saved offer templates and request details to create draft.
 */

import { createAdminClient } from '@/lib/supabase/server'

export interface OfferTemplate {
  id: string
  categoryId: string
  title: string
  description: string
  basePrice: number
  estimatedDurationHours: number
  notes?: string
}

export const instantOffer = {
  /**
   * Generate offer draft from template for specific partner
   * Only PRO partners with enabled templates can use this
   */
  async generateForPartner(requestId: string, partnerId: string): Promise<void> {
    try {
      const supabaseAdmin = createAdminClient()
      console.log('[InstantOffer] Generating for partner:', { requestId, partnerId })

      // 1. Fetch partner's instant offer templates
      const { data: partner } = await (supabaseAdmin as any)
        .from('obrtnik_profiles')
        .select('plan_type')
        .eq('id', partnerId)
        .single()

      if (!partner?.plan_type || partner.plan_type !== 'PRO') {
        console.log('[InstantOffer] Partner not eligible for instant offers')
        return
      }

      // 2. Fetch request details
      const { data: request } = await (supabaseAdmin as any)
        .from('povprasevanja')
        .select('id, category_id, description, title, budget_min, budget_max')
        .eq('id', requestId)
        .single()

      if (!request) {
        console.warn('[InstantOffer] Request not found:', requestId)
        return
      }

      // 3. Find matching template for this category
      const templates: OfferTemplate[] = partner.instant_offer_templates || []
      const templateForCategory = templates.find(
        (t) => t.categoryId === request.category_id
      )

      if (!templateForCategory) {
        console.log('[InstantOffer] No template for category:', request.category_id)
        return
      }

      // 4. Generate draft offer from template + request context
      const draftOffer = {
        povprasevanje_id: requestId,
        obrtnik_id: partnerId,
        price_estimate: this.calculatePrice(
          templateForCategory.basePrice,
          request
        ),
        price_type: 'fiksna' as const, // Use literal type 'fiksna'
        status: 'draft' as const, // Draft status - partner must review and confirm before sending
        message: `${templateForCategory.title}\n\n${this.personalizeDescription(
          templateForCategory.description,
          request
        )}\n\nTemelji se na naši standardni ponudbi. Lahko se jo prilagodim na podlagi detajlov.`,
      }

      // 5. Save draft offer
      const { error: insertError } = await supabaseAdmin
        .from('ponudbe')
        .insert(draftOffer as any)

      if (insertError) {
        console.error('[InstantOffer] Failed to create draft:', insertError)
        return
      }

      console.log('[InstantOffer] Draft created successfully:', draftOffer)

      // 6. Note: Marketplace event logging requires schema regeneration
      // TODO: Re-enable when Supabase types are updated to include marketplace_events table
    } catch (error) {
      console.error('[InstantOffer] generateForPartner failed:', error)
    }
  },

  /**
   * Personalize template description with request context
   * E.g., replace {city} with actual city, {service} with service name
   */
  personalizeDescription(template: string, request: any): string {
    let description = template
    
    description = description.replace('{city}', 'Vaše lokacije')
    description = description.replace('{service}', request.title || 'storitve')
    
    if (request.budget_max) {
      description = description.replace(
        '{budget}',
        `do ${request.budget_max} €`
      )
    }

    return description
  },

  /**
   * Calculate price based on template base + request complexity
   * Simple: use base price, Medium: +10%, Complex: +20%
   */
  calculatePrice(basePrice: number, request: any): number {
    // Estimate complexity from description length
    const descriptionLength = request.description?.length || 0
    
    if (descriptionLength > 500) {
      // Complex project
      return Math.round(basePrice * 1.2 * 100) / 100
    } else if (descriptionLength > 200) {
      // Medium complexity
      return Math.round(basePrice * 1.1 * 100) / 100
    }
    
    // Simple
    return basePrice
  },

  /**
   * Fetch partner's instant offer templates
   * NOTE: This feature requires the instant_offer_templates column in obrtnik_profiles
   * For now, returns empty array until schema is updated
   */
  async getTemplates(partnerId: string): Promise<OfferTemplate[]> {
    // TODO: Implement when instant_offer_templates column is added to obrtnik_profiles table
    return []
  },

  /**
   * Save or update partner's instant offer templates
   * NOTE: This feature requires the instant_offer_templates column in obrtnik_profiles
   * For now, this is a no-op until schema is updated
   */
  async saveTemplates(
    partnerId: string,
    templates: OfferTemplate[]
  ): Promise<void> {
    // TODO: Implement when instant_offer_templates column is added to obrtnik_profiles table
    console.log('[InstantOffer] saveTemplates called but not implemented - awaiting schema update')
  },
}
