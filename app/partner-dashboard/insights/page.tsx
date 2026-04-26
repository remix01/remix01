import { createClient } from '@/lib/supabase/server'
import { normalizeTier, tierHasFeature } from '@/lib/plans'
import { TierGate } from '@/components/partner/tier-gate'
import InsightsClient from './insights-client'

export default async function InsightsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('obrtnik_profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .maybeSingle()

  const tier = normalizeTier(profile?.subscription_tier)
  if (!tierHasFeature(tier, 'insights')) {
    return (
      <TierGate
        requiredTier="pro"
        description="AI uvidi in poslovni svetovalec sta na voljo samo za PRO in ELITE partnerje."
      />
    )
  }

  return <InsightsClient />
}
