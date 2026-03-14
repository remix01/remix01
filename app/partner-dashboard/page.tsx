'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PartnerSidebar } from '@/components/partner/sidebar'
import { PartnerBottomNav } from '@/components/partner/bottom-nav'
import { OfferForm } from '@/components/partner/offer-form'
import { OffersList } from '@/components/partner/offers-list'
import { PartnerStats } from '@/components/partner/partner-stats'
import { PaymentsSection } from '@/components/partner/payments-section'
import { NotificationPreferences } from '@/components/liftgo/NotificationPreferences'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function PartnerDashboard() {
  const router = useRouter()
  const [partner, setPartner] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState<any[]>([])
  const [openRequestsCount, setOpenRequestsCount] = useState(0)
  const [activeTab, setActiveTab] = useState('overview')

  const supabase = createClient()

  useEffect(() => {
    const getPartner = async () => {
      const sb = createClient()
      const {
        data: { user },
      } = await sb.auth.getUser()

      if (!user) {
        router.push('/partner-auth/login')
        return
      }

      const { data: partnerData } = await sb
        .from('obrtnik_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (partnerData) {
        setPartner(partnerData)

        // Fetch offers
        const { data: offersData } = await sb
          .from('ponudbe')
          .select('*')
          .eq('obrtnik_id', partnerData.id)
          .order('created_at', { ascending: false })

        if (offersData) {
          setOffers(offersData)
        }

        // Fetch open requests count
        const { count: openCount } = await sb
          .from('povprasevanja')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'odprto')

        if (openCount !== null) {
          setOpenRequestsCount(openCount)
        }
      }

      setLoading(false)
    }

    getPartner()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOfferCreated = async (partnerId: string) => {
    const { data } = await supabase
      .from('ponudbe')
      .select('*')
      .eq('obrtnik_id', partnerId)
      .order('created_at', { ascending: false })

    if (data) {
      setOffers(data)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Niste registrirani kot partner.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <PartnerSidebar partner={partner} />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Header with business name and subscription badge */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{partner?.business_name || 'Moj portal'}</h1>
              <p className="text-muted-foreground mt-1">
                {partner?.is_verified && '✓ '} Dobrodošli nazaj
              </p>
            </div>
            {partner?.subscription_tier && (
              <div className="text-sm font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
                {partner.subscription_tier === 'pro' ? 'PRO plan' : 'START plan'}
              </div>
            )}
          </div>

          {/* Open requests CTA banner */}
          <Card className="mb-8 p-6 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
              <div>
                <h3 className="font-semibold text-lg text-foreground mb-1">
                  🆕 {openRequestsCount} povpraševanj čaka na vašo ponudbo
                </h3>
                <p className="text-sm text-muted-foreground">
                  Pošljite ponudbo in pridobite nove stranke
                </p>
              </div>
              <Link href="/partner-dashboard/povprasevanja" className="flex-shrink-0">
                <Button className="gap-2 whitespace-nowrap">
                  Pregled povpraševanj →
                </Button>
              </Link>
            </div>
          </Card>

          {/* Horizontally scrollable tabs for mobile */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="overflow-x-auto scrollbar-hide">
              <TabsList className="flex-nowrap w-max">
                <TabsTrigger value="overview">Pregled</TabsTrigger>
                <TabsTrigger value="offers">Ponudbe ({offers.length})</TabsTrigger>
                <TabsTrigger value="payments">Plačila</TabsTrigger>
                <TabsTrigger value="notifications">Obvestila</TabsTrigger>
                <TabsTrigger value="new-offer">Nova ponudba</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-6">
              <PartnerStats partnerId={partner.id} offers={offers} />
            </TabsContent>

            <TabsContent value="offers" className="space-y-6">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6">Vaše ponudbe</h2>
                <OffersList offers={offers} partnerId={partner.id} onUpdate={() => handleOfferCreated(partner.id)} />
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-6">
              <PaymentsSection partnerId={partner.id} />
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <NotificationPreferences />
            </TabsContent>

            <TabsContent value="new-offer" className="space-y-6">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6">Oddajte novo ponudbo</h2>
                <OfferForm partnerId={partner.id} onSuccess={() => handleOfferCreated(partner.id)} />
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <PartnerBottomNav paket={partner?.subscription_tier === 'pro' ? { paket: 'pro' } : { paket: 'start' }} />
    </div>
  )
}
