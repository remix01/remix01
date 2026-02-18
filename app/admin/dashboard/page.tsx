'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Badge } from '@/components/ui/badge'

interface AnalyticsSummary {
  today: {
    events: number
    activeUsers: number
    inquiries: number
    conversions: number
  }
  last7Days: Array<{
    date: string
    events: number
    inquiries: number
    conversions: number
  }>
  topCategories: Array<{
    category: string
    count: number
  }>
  funnel: {
    inquiries: number
    offers: number
    accepted: number
    paid: number
  }
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/analytics/summary')
      
      if (response.status === 401 || response.status === 403) {
        router.push('/prijava')
        return
      }

      if (!response.ok) {
        throw new Error('Napaka pri pridobivanju podatkov')
      }

      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznana napaka')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Nadzorna plošča</h1>
        <div className="text-muted-foreground">Nalaganje...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Nadzorna plošča</h1>
        <div className="text-destructive">{error || 'Napaka pri nalaganju'}</div>
      </div>
    )
  }

  // Calculate funnel drop-off percentages
  const funnelData = [
    { stage: 'Povpraševanja', value: data.funnel.inquiries, percent: 100 },
    {
      stage: 'Ponudbe',
      value: data.funnel.offers,
      percent: data.funnel.inquiries > 0 ? Math.round((data.funnel.offers / data.funnel.inquiries) * 100) : 0,
    },
    {
      stage: 'Sprejeto',
      value: data.funnel.accepted,
      percent: data.funnel.inquiries > 0 ? Math.round((data.funnel.accepted / data.funnel.inquiries) * 100) : 0,
    },
    {
      stage: 'Plačano',
      value: data.funnel.paid,
      percent: data.funnel.inquiries > 0 ? Math.round((data.funnel.paid / data.funnel.inquiries) * 100) : 0,
    },
  ]

  // Format chart data
  const chartData = data.last7Days.map((day) => ({
    datum: new Date(day.date).toLocaleDateString('sl-SI', { month: 'short', day: 'numeric' }),
    dogodki: day.events,
    povpraševanja: day.inquiries,
    konverzije: day.conversions,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Nadzorna plošča</h1>
        <p className="mt-2 text-muted-foreground">Pregled analitike v realnem času</p>
      </div>

      {/* Today's stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Povpraševanja danes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.today.inquiries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sprejete ponudbe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.today.conversions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktivni uporabniki</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.today.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dogodki danes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.today.events}</div>
          </CardContent>
        </Card>
      </div>

      {/* 7-day trend */}
      <Card>
        <CardHeader>
          <CardTitle>Trend (zadnjih 7 dni)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="datum" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Line type="monotone" dataKey="dogodki" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line type="monotone" dataKey="povpraševanja" stroke="hsl(var(--accent))" strokeWidth={2} />
              <Line type="monotone" dataKey="konverzije" stroke="hsl(var(--chart-3))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top categories */}
        <Card>
          <CardHeader>
            <CardTitle>Najpogostejše kategorije</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.topCategories}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">Ni podatkov</div>
            )}
          </CardContent>
        </Card>

        {/* Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Prodajni lijak (7 dni)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {funnelData.map((step, index) => (
                <div key={step.stage}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{step.stage}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{step.value}</span>
                      <Badge variant={step.percent < 50 ? 'destructive' : 'secondary'}>
                        {step.percent}%
                      </Badge>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${step.percent}%` }}
                    />
                  </div>
                  {index < funnelData.length - 1 && (
                    <div className="text-xs text-muted-foreground mt-1 text-right">
                      ↓ -{100 - funnelData[index + 1].percent}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
