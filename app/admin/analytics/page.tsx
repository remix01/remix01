'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { KpiCard } from '@/components/admin/KpiCard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TrendingUp, DollarSign, Users, Zap, BarChart3, MessageSquare } from 'lucide-react'

interface AnalyticsData {
  kpis: {
    monthlyRevenue: number
    completedJobs: number
    conversionRate: number
    activeProUsers: number
    monthlyRevenueChange: number
    completedJobsChange: number
    proUsersChange: number
  }
  revenueChart: Array<{
    date: string
    revenue: number
  }>
  aiAnalytics: {
    totalAiCost: number
    avgMessagesPerUser: number
    proUsagePercentage: number
    freeUsagePercentage: number
  }
  marketplaceMetrics: {
    totalRequests: number
    avgOffersPerRequest: number
    acceptanceRate: number
    totalOffers: number
  }
  topUsers: Array<{
    id: string
    email: string
    subscription_tier: string
    jobs_completed: number
    revenue_generated: number
  }>
}

export default function AnalyticsDashboard() {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/admin/analytics', {
          credentials: 'include',
        })

        if (response.status === 401 || response.status === 403) {
          router.push('/prijava?redirectTo=/admin/analytics')
          return
        }

        if (!response.ok) {
          throw new Error('Napaka pri pridobivanju podatkov')
        }

        const result = await response.json()
        setData(result)
        setError(null)
      } catch (err) {
        console.error('[v0] Analytics fetch error:', err)
        setError(err instanceof Error ? err.message : 'Napaka pri nalaganju podatkov')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 300000) // Refresh every 5 minutes
    return () => clearInterval(interval)
  }, [router])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analitika</h1>
          <p className="mt-2 text-muted-foreground">Naloži se...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analitika</h1>
          <p className="mt-2 text-destructive">{error || 'Napaka pri nalaganju'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analitika</h1>
        <p className="mt-2 text-muted-foreground">Pregled prihodkov, AI porabe in tržnih metrik</p>
      </div>

      {/* KPI Cards - Revenue & Jobs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Mesečni prihodek"
          value={`€${data.kpis.monthlyRevenue.toLocaleString('sl-SI', { maximumFractionDigits: 0 })}`}
          change={data.kpis.monthlyRevenueChange}
          icon={DollarSign}
        />
        <KpiCard
          title="Opravljenih del"
          value={data.kpis.completedJobs}
          change={data.kpis.completedJobsChange}
          icon={BarChart3}
        />
        <KpiCard
          title="Stopnja konverzije"
          value={`${data.kpis.conversionRate}%`}
          icon={TrendingUp}
        />
        <KpiCard
          title="Aktivnih PRO"
          value={data.kpis.activeProUsers}
          change={data.kpis.proUsersChange}
          icon={Users}
        />
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Prihodek po dnevih</CardTitle>
          <CardDescription>Dnevni prihodek iz provizij v zadnjih 30 dneh</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value) => `€${value.toLocaleString('sl-SI', { maximumFractionDigits: 2 })}`}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* AI Analytics & Marketplace Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* AI Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              AI Analitika
            </CardTitle>
            <CardDescription>Poraba AI funkcionalnosti</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Skupni stroški AI</span>
                <span className="text-lg font-bold">€{data.aiAnalytics.totalAiCost.toFixed(2)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: '60%' }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Povprečna sporočila/uporabnik</span>
                <Badge variant="secondary">{data.aiAnalytics.avgMessagesPerUser.toFixed(1)}</Badge>
              </div>
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="text-sm font-medium">Poraba po tieru:</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">PRO</span>
                <span className="font-semibold">{data.aiAnalytics.proUsagePercentage}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${data.aiAnalytics.proUsagePercentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">FREE</span>
                <span className="font-semibold">{data.aiAnalytics.freeUsagePercentage}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-400"
                  style={{ width: `${data.aiAnalytics.freeUsagePercentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Marketplace Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Tržni pokazatelji
            </CardTitle>
            <CardDescription>Dinamika povpraševanja in ponudb</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Skupna povpraševanja</p>
                <p className="text-2xl font-bold">{data.marketplaceMetrics.totalRequests}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Skupne ponudbe</p>
                <p className="text-2xl font-bold">{data.marketplaceMetrics.totalOffers}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Povprečne ponudbe/povpraševanje</span>
                <Badge variant="secondary">{data.marketplaceMetrics.avgOffersPerRequest.toFixed(1)}</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Stopnja sprejema</span>
                <span className="font-semibold">{data.marketplaceMetrics.acceptanceRate}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${data.marketplaceMetrics.acceptanceRate}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Najboljši obrtniki</CardTitle>
          <CardDescription>Obrtniki z največ opravljenih del in prihodkov</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-pošta</TableHead>
                  <TableHead>Paket</TableHead>
                  <TableHead className="text-right">Opravljenih del</TableHead>
                  <TableHead className="text-right">Prihodek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topUsers.length > 0 ? (
                  data.topUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.subscription_tier === 'pro'
                              ? 'default'
                              : user.subscription_tier === 'elite'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {user.subscription_tier.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {user.jobs_completed}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        €{user.revenue_generated.toLocaleString('sl-SI', { maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Ni podatkov
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
