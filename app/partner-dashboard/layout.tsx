import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PartnerSidebar } from '@/components/partner/sidebar'
import { PartnerBottomNav } from '@/components/partner/bottom-nav'

export default async function PartnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/prijava')

  const { data: partner } = await supabase
    .from('obrtnik_profiles')
    .select('business_name, subscription_tier, avg_rating, is_verified')
    .eq('id', user.id)
    .maybeSingle()

  if (!partner) redirect('/prijava')

  const tier =
    partner.subscription_tier === 'elite'
      ? 'elite'
      : partner.subscription_tier === 'pro'
        ? 'pro'
        : ('start' as const)

  return (
    <div className="min-h-screen overflow-x-hidden bg-background lg:flex lg:h-screen">
      <PartnerSidebar
        partner={{
          business_name: partner.business_name || 'Moj portal',
          subscription_tier: tier,
          avg_rating: partner.avg_rating ?? 0,
          is_verified: partner.is_verified ?? false,
        }}
      />
      <main className="min-w-0 flex flex-1 flex-col overflow-y-auto pb-20 md:pb-0">{children}</main>
      <PartnerBottomNav paket={{ paket: tier }} />
    </div>
  )
}
