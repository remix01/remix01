'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PartnerSidebar } from '@/components/partner/sidebar'
import { OfferForm } from '@/components/partner/offer-form'
import { OffersList } from '@/components/partner/offers-list'
import { PartnerStats } from '@/components/partner/partner-stats'
import { PaymentsSection } from '@/components/partner/payments-section'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function PartnerDashboard() {
  const router = useRouter()
  const [partner, setPartner] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState<any[]>([])
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
        .from('partners')
        .select('*')
        .eq('id', user.id)
        .single()

      if (partnerData) {
        setPartner(partnerData)

        const { data: offersData } = await sb
          .from('offers')
          .select('*')
          .eq('partner_id', partnerData.id)
          .order('created_at', { ascending: false })

        if (offersData) {
          setOffers(offersData)
        }
      }

      setLoading(false)
    }

    getPartner()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOfferCreated = async (partnerId: string) => {
    const { data } = await supabase
      .from('offers')
      .select('*')
      .eq('partner_id', partnerId)
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
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Partner Portal</h1>
            <p className="text-muted-foreground">
              Dobrodošli, {partner.company_name}
            </p>
          </div>

          {/* New Requests Banner */}
          <Card className="mb-8 p-6 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
              <div>
                <h3 className="font-semibold text-lg text-foreground mb-1">
                  🆕 Nova povpraševanja dostopna
                </h3>
                <p className="text-sm text-muted-foreground">
                  Preglejte povpraševanja naročnikov in pošljite ponudbo
                </p>
              </div>
              <Link href="/partner-dashboard/povprasevanja" className="flex-shrink-0">
                <Button className="gap-2 whitespace-nowrap">
                  Poglej povpraševanja →
                </Button>
              </Link>
            </div>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Pregled</TabsTrigger>
              <TabsTrigger value="offers">Ponudbe ({offers.length})</TabsTrigger>
              <TabsTrigger value="payments">Plačila & zaslužek</TabsTrigger>
              <TabsTrigger value="new-offer">Nova ponudba</TabsTrigger>
            </TabsList>

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

            <TabsContent value="new-offer" className="space-y-6">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6">Oddajte novo ponudbo</h2>
                <OfferForm partnerId={partner.id} onSuccess={() => handleOfferCreated(partner.id)} />
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
