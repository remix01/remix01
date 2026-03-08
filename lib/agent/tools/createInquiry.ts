/**
 * Create Inquiry Tool
 * User creates a new service request (povprasevanje)
 */

import { createClient } from '@/lib/supabase/server'
import type { AgentContext } from '../context'

export async function createInquiry(
  params: Record<string, unknown>,
  context: AgentContext
): Promise<{ inquiryId: string; status: string }> {
  const { title, description, categorySlug, location, urgency, budget, maxResponses } = params as any

  // Validate required params
  if (!title || !description || !categorySlug || !location) {
    throw {
      success: false,
      error: 'Missing required fields: title, description, categorySlug, location',
      code: 400,
    }
  }

  try {
    const supabase = await createClient()

    // Get category ID from slug
    const { data: categoryData, error: catError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single()

    if (catError || !categoryData) {
      throw {
        success: false,
        error: `Category not found: ${categorySlug}`,
        code: 404,
      }
    }

    // Create inquiry
    const { data: inquiry, error: createError } = await supabase
      .from('povprasevanja')
      .insert({
        title,
        description,
        category_id: categoryData.id,
        narocnik_id: context.userId,
        location_city: location,
        urgency: urgency || 'normalno',
        budget_cents: budget ? Math.round(budget * 100) : null,
        max_responses: maxResponses || 5,
        status: 'open',
      })
      .select('id')
      .single()

    if (createError || !inquiry) {
      throw {
        success: false,
        error: 'Failed to create inquiry',
        code: 500,
      }
    }

    return {
      inquiryId: inquiry.id,
      status: 'open',
    }
  } catch (error: any) {
    throw {
      success: false,
      error: error?.error || error?.message || 'Failed to create inquiry',
      code: error?.code || 500,
    }
  }
}
