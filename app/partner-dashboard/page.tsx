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
import { CheckCircle2, Circle, Moon, Sun } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import type { Offer } from '@/lib/types/offer'
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
  const [avgRating, setAvgRating] = useState<number>(0)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [completionStatus, setCompletionStatus] = useState<any>(null)
  const [vacationMode, setVacationMode] = useState(false)
  const [vacationLoading, setVacationLoading] = useState(false)
  const skipFirstRefresh = useRef(true)

  const filterQuery = serializeDashboardFilters(parseDashboardFilters(searchParams))

  const toggleVacationMode = async (enabled: boolean) => {
    setVacationLoading(true)
    try {
      const res = await fetch('/api/partner/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vacation_mode: enabled }),
      })
      if (res.ok) setVacationMode(enabled)
    } catch (e) {
      console.error('[dashboard] vacation mode toggle failed:', e)
    } finally {
      setVacationLoading(false)
    }
  }

  const handleOfferCreated = async (partnerId?: string) => {
    const id = partnerId ?? partner?.id
    if (!id) return
    const summary = await getPartnerDashboardSummary({
      userId: id,
      filters: parseDashboardFilters(searchParams),
    })
    setOffers(summary.offers as unknown as Offer[])
    if (summary.onboardingProgress) setCompletionStatus(summary.onboardingProgress)
    setAvgRating(summary.avgRating ?? 0)
  }

  useEffect(() => {
    const getPartner = async () => {
      // Fetch via API route: admin client bypasses RLS (is_verified=true policy
      // blocks unverified obrtniks from reading their own row via session client).
      const res = await fetch('/api/partner/me')

      if (res.status === 401) {
        router.push('/prijava?redirect=/partner-dashboard')
        return
      }

      const partnerData = res.ok ? await res.json() : null

      if (partnerData) {
        setPartner(partnerData)
        setVacationMode(!!(partnerData as any).vacation_mode)

        const summary = await getPartnerDashboardSummary({
          userId: partnerData.id,
          filters: parseDashboardFilters(searchParams),
        })

        if (summary.onboardingProgress) setCompletionStatus(summary.onboardingProgress)
        setOffers(summary.offers as unknown as Offer[])
        setOpenRequestsCount(summary.relevantOpenRequests)
        setAvgRating(summary.avgRating ?? 0)
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
      setAvgRating(summary.avgRating ?? 0)
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
          {/* Header with business name, subscription badge, and vacation mode toggle */}
          <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{partner?.business_name || 'Moj portal'}</h1>
              <p className="text-muted-foreground mt-1">
                {partner?.is_verified && '✓ '} Dobrodošli nazaj
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Daily lead counter (Rec 7) */}
              {(partner?.daily_lead_limit ?? 0) > 0 && (
                <Badge variant="outline" className="text-xs">
                  Leadi danes: {partner?.daily_leads_today ?? 0} / {partner?.daily_lead_limit}
                </Badge>
              )}
              {/* Vacation mode toggle (Rec 7) */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background">
                {vacationMode ? <Moon className="h-4 w-4 text-blue-500" /> : <Sun className="h-4 w-4 text-amber-500" />}
                <span className="text-sm font-medium">{vacationMode ? 'Počitniški način' : 'Aktiven'}</span>
                <Switch
                  checked={vacationMode}
                  onCheckedChange={toggleVacationMode}
                  disabled={vacationLoading}
                  aria-label="Počitniški način"
                />
              </div>
              {partner?.subscription_tier && (
                <div className="text-sm font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
                  {partner.subscription_tier === 'elite' ? 'ELITE plan' : partner.subscription_tier === 'pro' ? 'PRO plan' : 'START plan'}
                </div>
              )}
            </div>
          </div>

          {/* Vacation mode banner */}
          {vacationMode && (
            <Card className="mb-6 p-4 border-blue-200 bg-blue-50">
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900 text-sm">Počitniški način je vklopljen</p>
                  <p className="text-blue-700 text-xs">Novi leadi vam ne bodo dodeljeni. Izklopite ga, ko se vrnete.</p>
                </div>
              </div>
            </Card>
          )}

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

          <Card className="mb-8 p-4">
            <div className="flex flex-wrap gap-2">
              <Link href={`/partner-dashboard/povprasevanja?${filterQuery}`}>
                <Button variant="outline">Nova povpraševanja</Button>
              </Link>
              <Link href={`/partner-dashboard?tab=offers&${filterQuery}`}>
                <Button variant="outline">Moje ponudbe</Button>
              </Link>
              <Link href={`/partner-dashboard?tab=overview&${filterQuery}`}>
                <Button variant="outline">Statistika</Button>
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
              <PartnerStats
                offers={offers}
                openRequestsCount={openRequestsCount}
                averageRating={avgRating}
              />
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
