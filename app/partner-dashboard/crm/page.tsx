'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PartnerSidebar } from '@/components/partner/sidebar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, DollarSign, TrendingUp, Clock, Users, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface CRMStats {
  inquiriesThisMonth: number
  offersSentThisMonth: number
  conversionRate: number
  revenueThisMonth: number
  avgResponseTime: number
}

interface Lead {
  id: string
  customer_name: string
  service_type: string
  location: string
  value: number
  stage: 'new' | 'in_progress' | 'awaiting_payment' | 'completed'
  daysInStage: number
  created_at: string
}

interface ActivityItem {
  id: string
  type: string
  timestamp: string
  description: string
  customer_name: string
  amount?: number
}

export default function CRMPage() {
  const router = useRouter()
  const supabase = createClient()
  const [partner, setPartner] = useState<any>(null)
  const [paket, setPaket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<CRMStats>({
    inquiriesThisMonth: 0,
    offersSentThisMonth: 0,
    conversionRate: 0,
    revenueThisMonth: 0,
    avgResponseTime: 0,
  })
  const [leads, setLeads] = useState<Lead[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/partner-auth/login')
          return
        }

        // Get partner info
        const { data: partnerData } = await supabase
          .from('partners')
          .select('*')
          .eq('id', user.id)
          .single()

        if (!partnerData) {
          router.push('/partner-auth/login')
          return
        }

        setPartner(partnerData)

        // Get partner package
        const { data: paketData } = await supabase
          .from('partner_paketi')
          .select('*')
          .eq('obrtnik_id', partnerData.id)
          .single()

        if (paketData) {
          setPaket(paketData)
          
          // Only load CRM data if PRO
          if (paketData.paket === 'pro') {
            await loadCRMData(partnerData.id)
          }
        }
      } catch (error) {
        console.error('[v0] Error loading CRM:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const loadCRMData = async (partnerId: string) => {
    try {
      // Load inquiries
      const { data: inquiries } = await supabase
        .from('povprasevanja')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })

      // Load offers
      const { data: offers } = await supabase
        .from('offers')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })

      // Load escrow transactions
      const { data: escrows } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })

      // Calculate stats
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const inquiriesThisMonth = (inquiries || []).filter(
        i => new Date(i.created_at) >= monthStart
      ).length

      const offersSentThisMonth = (offers || []).filter(
        o => new Date(o.created_at) >= monthStart
      ).length

      const offersAccepted = (offers || []).filter(o => o.status === 'accepted').length
      const conversionRate = offersSentThisMonth > 0 
        ? Math.round((offersAccepted / offersSentThisMonth) * 100)
        : 0

      const escrowsThisMonth = (escrows || []).filter(
        e => new Date(e.created_at) >= monthStart
      )
      const revenueThisMonth = escrowsThisMonth.reduce(
        (sum, e) => sum + (e.amount_cents || 0),
        0
      ) / 100

      setStats({
        inquiriesThisMonth,
        offersSentThisMonth,
        conversionRate,
        revenueThisMonth,
        avgResponseTime: 24, // TODO: Calculate from actual data
      })

      // Build leads from inquiries
      const leadsData: Lead[] = (inquiries || []).map(inq => ({
        id: inq.id,
        customer_name: inq.customer_name || 'Unknown',
        service_type: inq.service_type || '',
        location: inq.location || '',
        value: inq.budget || 0,
        stage: inq.stage || 'new',
        daysInStage: Math.floor((now.getTime() - new Date(inq.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        created_at: inq.created_at,
      }))

      setLeads(leadsData)

      // Build activity feed
      const activityItems: ActivityItem[] = []

      // Add inquiry events
      ;(inquiries || []).slice(0, 10).forEach(inq => {
        activityItems.push({
          id: `inquiry-${inq.id}`,
          type: 'inquiry_received',
          timestamp: inq.created_at,
          description: `Novo povpraševanje prejeto`,
          customer_name: inq.customer_name || 'Unknown',
          amount: inq.budget,
        })
      })

      // Add offer events
      ;(offers || []).slice(0, 10).forEach(off => {
        activityItems.push({
          id: `offer-${off.id}`,
          type: 'offer_sent',
          timestamp: off.created_at,
          description: `Ponudba poslana`,
          customer_name: off.customer_name || 'Unknown',
          amount: off.price,
        })
      })

      // Add escrow events
      ;(escrows || []).slice(0, 10).forEach(esc => {
        activityItems.push({
          id: `escrow-${esc.id}`,
          type: esc.status,
          timestamp: esc.created_at,
          description: `Depozitni račun ${esc.status}`,
          customer_name: esc.customer_name || 'Unknown',
          amount: esc.amount_cents / 100,
        })
      })

      // Sort by timestamp
      activityItems.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      setActivity(activityItems.slice(0, 20))
    } catch (error) {
      console.error('[v0] Error loading CRM data:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Nalagam CRM...</p>
        </div>
      </div>
    )
  }

  // Show upgrade prompt if not PRO
  if (paket?.paket !== 'pro') {
    return (
      <div className="flex h-screen bg-background">
        <PartnerSidebar partner={partner} />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md p-8 text-center border-amber-200 bg-amber-50">
            <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">PRO Paket Obvezen</h2>
            <p className="text-muted-foreground mb-6">
              CRM in generator ponudb sta na voljo samo za PRO partnernike.
            </p>
            <Button asChild className="w-full">
              <Link href="/cenik">Nadgradi v PRO</Link>
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <PartnerSidebar partner={partner} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">CRM Portal</h1>
            <p className="text-muted-foreground">
              Upravljajte svoje stranke in ponudbe
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid gap-4 mb-8 md:grid-cols-5">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Povpraševanja (ta mesec)</p>
                  <p className="text-2xl font-bold mt-1">{stats.inquiriesThisMonth}</p>
                </div>
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ponudbe (ta mesec)</p>
                  <p className="text-2xl font-bold mt-1">{stats.offersSentThisMonth}</p>
                </div>
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Konverzija</p>
                  <p className="text-2xl font-bold mt-1">{stats.conversionRate}%</p>
                </div>
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Zaslužek (ta mesec)</p>
                  <p className="text-2xl font-bold mt-1">€{stats.revenueThisMonth.toFixed(0)}</p>
                </div>
                <DollarSign className="h-6 w-6 text-amber-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Povp. odziv</p>
                  <p className="text-2xl font-bold mt-1">{stats.avgResponseTime}h</p>
                </div>
                <Clock className="h-6 w-6 text-cyan-500" />
              </div>
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Pipeline View */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold mb-4">Vodovod prodaje</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {(['new', 'in_progress', 'awaiting_payment', 'completed'] as const).map(stage => {
                  const stageName = {
                    new: 'Nova povpraševanja',
                    in_progress: 'V napredku',
                    awaiting_payment: 'Čakam plačilo',
                    completed: 'Zaključena',
                  }[stage]

                  const stageLeads = leads.filter(l => l.stage === stage)

                  return (
                    <Card key={stage} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-sm">{stageName}</h3>
                        <Badge>{stageLeads.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {stageLeads.slice(0, 3).map(lead => (
                          <div key={lead.id} className="p-2 bg-muted rounded text-xs">
                            <p className="font-medium truncate">{lead.customer_name}</p>
                            <p className="text-muted-foreground truncate">{lead.service_type}</p>
                            <p className="text-muted-foreground">€{lead.value}</p>
                          </div>
                        ))}
                        {stageLeads.length > 3 && (
                          <p className="text-xs text-muted-foreground p-2">
                            +{stageLeads.length - 3} več
                          </p>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Activity Feed */}
            <div>
              <h2 className="text-xl font-bold mb-4">Nedavna aktivnost</h2>
              <Card className="p-4">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activity.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Brez aktivnosti
                    </p>
                  ) : (
                    activity.map(item => (
                      <div key={item.id} className="text-xs border-b pb-3 last:border-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{item.description}</p>
                            <p className="text-muted-foreground">{item.customer_name}</p>
                          </div>
                          {item.amount && (
                            <span className="font-semibold text-green-600 whitespace-nowrap">
                              €{item.amount.toFixed(0)}
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs mt-1">
                          {Math.floor((new Date().getTime() - new Date(item.timestamp).getTime()) / (1000 * 60))} min nazaj
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
