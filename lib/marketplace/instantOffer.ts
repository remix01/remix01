/**
 * Instant Offer Generator
 *
 * Auto-generates offer drafts for PRO plan partners with instant offers enabled.
 * Only used for PRO partners (not sent automatically, requires partner confirmation).
 * Pulls from partner's saved offer templates and request details to create draft.
 */

import { createAdminClient } from '@/lib/supabase/server'
import type { Database, Json } from '@/types/supabase'

export interface OfferTemplate {
  id: string
  categoryId: string
  title: string
  description: string
  basePrice: number
  estimatedDurationHours: number
  notes?: string
}

type RequestContext = Pick<
  Database['public']['Tables']['povprasevanja']['Row'],
  'id' | 'category_id' | 'description' | 'title' | 'location_city' | 'budget_min' | 'budget_max'
>

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
      const { data: partner } = await supabaseAdmin
        .from('obrtnik_profiles')
        .select('plan_type, instant_offer_templates')
        .eq('id', partnerId)
        .single()

      if (!partner?.plan_type || partner.plan_type !== 'PRO') {
        console.log('[InstantOffer] Partner not eligible for instant offers')
        return
      }

      // 2. Fetch request details
      const { data: request } = await supabaseAdmin
        .from('povprasevanja')
        .select('id, category_id, description, title, location_city, budget_min, budget_max')
        .eq('id', requestId)
        .single()

      if (!request) {
        console.warn('[InstantOffer] Request not found:', requestId)
        return
      }

      // 3. Find matching template for this category
      const templates: OfferTemplate[] = (partner.instant_offer_templates as unknown as OfferTemplate[]) || []
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
        title: templateForCategory.title,
        description: this.personalizeDescription(
          templateForCategory.description,
          request
        ),
        price_estimate: this.calculatePrice(
          templateForCategory.basePrice,
          request
        ),
        price_type: 'fiksna' as const,
        message: `Temelji se na naši standardni ponudbi za ${request.location_city}. Lahko se jo prilagodim na podlagi detajlov.`,
        status: 'draft' as const,
        estimated_duration: templateForCategory.estimatedDurationHours,
        notes: templateForCategory.notes ?? null,
        auto_generated: true,
        template_id: templateForCategory.id,
      }

      // 5. Save draft offer
      const { error: insertError } = await supabaseAdmin
        .from('ponudbe')
        .insert(draftOffer)

      if (insertError) {
        console.error('[InstantOffer] Failed to create draft:', insertError)
        return
      }

      console.log('[InstantOffer] Draft created successfully:', draftOffer)

      // 6. Log marketplace event
      await supabaseAdmin.from('marketplace_events').insert({
        event_type: 'instant_offer',
        request_id: requestId,
        partner_id: partnerId,
        metadata: {
          basePrice: templateForCategory.basePrice,
          finalPrice: draftOffer.price_estimate,
          template: templateForCategory.id,
        },
      })
    } catch (error) {
      console.error('[InstantOffer] generateForPartner failed:', error)
    }
  },

  /**
   * Personalize template description with request context
   * E.g., replace {city} with actual city, {service} with service name
   */
  personalizeDescription(template: string, request: RequestContext): string {
    let description = template

    description = description.replace('{city}', request.location_city || 'Vaše lokacije')
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
  calculatePrice(basePrice: number, request: Pick<RequestContext, 'description'>): number {
    // Estimate complexity from description length
    const descriptionLength = request.description?.length ?? 0

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
   */
  async getTemplates(partnerId: string): Promise<OfferTemplate[]> {
    const supabaseAdmin = createAdminClient()
    const { data: partner } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('instant_offer_templates')
      .eq('id', partnerId)
      .single()

    return (partner?.instant_offer_templates as unknown as OfferTemplate[]) || []
  },

  /**
   * Save or update partner's instant offer templates
   */
  async saveTemplates(
    partnerId: string,
    templates: OfferTemplate[]
  ): Promise<void> {
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
      .from('obrtnik_profiles')
      .update({
        instant_offer_templates: templates as unknown as Json,
      })
      .eq('id', partnerId)

    if (error) {
      throw new Error(`Failed to save templates: ${error.message}`)
    }

    console.log('[InstantOffer] Templates saved for partner:', partnerId)
  },
}
