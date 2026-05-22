'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PartnerStats } from '@/components/partner/partner-stats'
import { RouteOptimizerCard } from '@/components/partner/RouteOptimizerCard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle2, Circle } from 'lucide-react'
import type { Offer } from '@/lib/types/offer'
import { createClient } from '@/lib/supabase/client'
import { getPartnerDashboardSummary } from '@/lib/partner/dashboard-summary'
import { parseDashboardFilters, serializeDashboardFilters } from '@/lib/dashboard/filters'

const OfferForm = dynamic(
  () => import('@/components/partner/offer-form').then((m) => m.OfferForm),
  { loading: () => null }
)

const OffersList = dynamic(
  () => import('@/components/partner/offers-list').then((m) => m.OffersList),
  { loading: () => null }
)

const PaymentsSection = dynamic(
  () => import('@/components/partner/payments-section').then((m) => m.PaymentsSection),
  { loading: () => null }
)

const NotificationPreferences = dynamic(
  () => import('@/components/liftgo/NotificationPreferences').then((m) => m.NotificationPreferences),
  { loading: () => null }
)

const ReferralSection = dynamic(
  () => import('@/components/partner/ReferralSection').then((m) => m.ReferralSection),
  { loading: () => null }
)

const ListSyncToolbar = dynamic(
  () => import('@/components/partner/list-sync-toolbar').then((m) => m.ListSyncToolbar),
  { loading: () => null }
)

function PartnerDashboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const allowedTabs = ['overview', 'offers', 'payments', 'referral', 'notifications', 'new-offer'] as const
  const initialTab = 'overview'
  const [partner, setPartner] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState<Offer[]>([])
  const [openRequestsCount, setOpenRequestsCount] = useState(0)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [completionStatus, setCompletionStatus] = useState<any>(null)
  const skipFirstRefresh = useRef(true)

  const supabase = createClient()
  const filterQuery = serializeDashboardFilters(parseDashboardFilters(searchParams))

  const handleOfferCreated = async (partnerId?: string) => {
    const id = partnerId ?? partner?.id
    if (!id) return
    const { data: offersData } = await supabase
      .from('ponudbe')
      .select('*')
      .eq('obrtnik_id', id)
      .order('created_at', { ascending: false })
    if (offersData) {
      setOffers(offersData as unknown as Offer[])
      setCompletionStatus((prev: any) =>
        prev
          ? {
              ...prev,
              hasOffers: offersData.length > 0,
              completionPercentage: prev.hasOffers === (offersData.length > 0)
                ? prev.completionPercentage
                : (([
                    prev.hasDescription,
                    prev.hasHourlyRate,
                    prev.hasPhone,
                    offersData.length > 0,
                  ].filter(Boolean).length / 4) * 100),
            }
          : prev
      )
    }
  }

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

        const summary = await getPartnerDashboardSummary({
          userId: partnerData.id,
          filters: parseDashboardFilters(searchParams),
        })

        if (summary.onboardingProgress) setCompletionStatus(summary.onboardingProgress)
        setOffers(summary.offers as unknown as Offer[])
        setOpenRequestsCount(summary.relevantOpenRequests)
        skipFirstRefresh.current = false
      }

      setLoading(false)
    }

    getPartner()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  useEffect(() => {
    const refreshSummary = async () => {
      if (!partner?.id) return
      if (skipFirstRefresh.current) {
        skipFirstRefresh.current = false
        return
      }
      const summary = await getPartnerDashboardSummary({
        userId: partner.id,
        filters: parseDashboardFilters(searchParams),
      })
      setOpenRequestsCount(summary.relevantOpenRequests)
    }

    refreshSummary()
  }, [partner?.id, searchParams])

  useEffect(() => {
    const tab = searchParams.get('tab')
    const tabIsAllowed = tab && allowedTabs.includes(tab as typeof allowedTabs[number])
    if (tabIsAllowed) {
      setActiveTab(tab)
    }
  }, [searchParams])

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
                {partner.subscription_tier === 'elite' ? 'ELITE plan' : partner.subscription_tier === 'pro' ? 'PRO plan' : 'START plan'}
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
              <Link href={`/partner-dashboard/povprasevanja?${filterQuery}`} className="flex-shrink-0">
                <Button className="gap-2 whitespace-nowrap">
                  Pregled povpraševanj →
                </Button>
              </Link>
            </div>
          </Card>

          {/* Onboarding Checklist - Show only if completion < 80% */}
          {completionStatus && completionStatus.completionPercentage < 80 && (
            <Card className="mb-8 bg-blue-50 border-blue-200">
              <div className="p-6">
                <h3 className="font-semibold text-lg text-foreground mb-4">
                  🚀 Dokončajte vašo nastanitev
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Izpolnite naslednje korake za boljšo vidnost in več povpraševanj
                </p>
                <div className="space-y-3">
                  {/* Item 1: Description */}
                  <Link href={`/partner-dashboard/account?${filterQuery}`} className="flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-muted transition-colors">
                    {completionStatus.hasDescription ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={completionStatus.hasDescription ? 'line-through text-muted-foreground' : ''}>
                      Dodajte opis podjetja
                    </span>
                  </Link>

                  {/* Item 2: Hourly Rate */}
                  <Link href={`/partner-dashboard/account?${filterQuery}`} className="flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-muted transition-colors">
                    {completionStatus.hasHourlyRate ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={completionStatus.hasHourlyRate ? 'line-through text-muted-foreground' : ''}>
                      Dodajte urno postavko
                    </span>
                  </Link>

                  {/* Item 3: Phone */}
                  <Link href={`/partner-dashboard/account?${filterQuery}`} className="flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-muted transition-colors">
                    {completionStatus.hasPhone ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={completionStatus.hasPhone ? 'line-through text-muted-foreground' : ''}>
                      Dodajte kontaktno telefonsko
                    </span>
                  </Link>

                  {/* Item 4: First Offer */}
                  <Link href={`/partner-dashboard?tab=new-offer&${filterQuery}`} className="flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-muted transition-colors">
                    {completionStatus.hasOffers ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={completionStatus.hasOffers ? 'line-through text-muted-foreground' : ''}>
                      Pošljite prvo ponudbo
                    </span>
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {/* Horizontally scrollable tabs for mobile */}
          <Tabs value={activeTab} onValueChange={(tab) => {
            setActiveTab(tab)
            router.replace(`/partner-dashboard?tab=${tab}&${filterQuery}`)
          }} className="space-y-6">
            <div className="overflow-x-auto scrollbar-hide">
              <TabsList className="flex-nowrap w-max">
                <TabsTrigger value="overview">Pregled</TabsTrigger>
                <TabsTrigger value="offers">Ponudbe ({offers.length})</TabsTrigger>
                <TabsTrigger value="payments">Plačila</TabsTrigger>
                <TabsTrigger value="referral">Povabi prijatelje</TabsTrigger>
                <TabsTrigger value="notifications">Obvestila</TabsTrigger>
                <TabsTrigger value="new-offer">Nova ponudba</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-6">
              <PartnerStats offers={offers} />
              <RouteOptimizerCard visits={offers} />
            </TabsContent>

            <TabsContent value="offers" className="space-y-6">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6">Vaše ponudbe</h2>
                <ListSyncToolbar className="mb-4" />
                <OffersList offers={offers} onUpdate={() => handleOfferCreated()} currentUserId={partner.id} />
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-6">
              <PaymentsSection partnerId={partner.id} />
            </TabsContent>

            <TabsContent value="referral" className="space-y-6">
              <ReferralSection />
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <NotificationPreferences />
            </TabsContent>

            <TabsContent value="new-offer" className="space-y-6">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6">Oddajte novo ponudbo</h2>
                <OfferForm partnerId={partner.id} onSuccess={() => handleOfferCreated()} />
              </Card>
            </TabsContent>
          </Tabs>
    </div>
  )
}

export default function PartnerDashboard() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Nalagam...</div>}>
      <PartnerDashboardInner />
    </Suspense>
  )
}
