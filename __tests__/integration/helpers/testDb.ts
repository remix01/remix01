import { supabaseAdmin } from '@/lib/supabase-admin'

export const testDb = {
  async reset() {
    // Clear all test tables
    await Promise.all([
      supabaseAdmin.from('inquiries').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabaseAdmin.from('offers').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabaseAdmin.from('escrows').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabaseAdmin.from('disputes').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    ])
  },

  async getInquiry(inquiryId: string) {
    const { data } = await supabaseAdmin
      .from('inquiries')
      .select('*')
      .eq('id', inquiryId)
      .single()
    return data
  },

  async getOffer(offerId: string) {
    const { data } = await supabaseAdmin
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single()
    return data
  },

  async getEscrow(escrowId: string) {
    const { data } = await supabaseAdmin
      .from('escrows')
      .select('*')
      .eq('id', escrowId)
      .single()
    return data
  },

  async getDispute(disputeId: string) {
    const { data } = await supabaseAdmin
      .from('disputes')
      .select('*')
      .eq('id', disputeId)
      .single()
    return data
  },
}
