'use client'

import { TrendingUp, Users, Activity, Zap } from 'lucide-react'

interface AnalyticsCardsProps {
  data: any[]
}

export function AnalyticsCards({ data }: AnalyticsCardsProps) {
  const stats = [
    {
      icon: Activity,
      label: 'Skupno zapisov',
      value: data.length,
      color: 'text-primary',
    },
    {
      icon: TrendingUp,
      label: 'Končano',
      value: data.filter((d) => d.status === 'completed').length,
      color: 'text-green-600',
    },
    {
      icon: Users,
      label: 'V teku',
      value: data.filter((d) => d.status === 'pending').length,
      color: 'text-yellow-600',
    },
    {
      icon: Zap,
      label: 'Povprečna vrednost',
      value: (
        data.reduce((sum, d) => sum + (d.value || 0), 0) / Math.max(data.length, 1)
      ).toFixed(1),
      color: 'text-accent',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border bg-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {stat.value}
              </p>
            </div>
            <div className={`rounded-lg bg-muted p-2.5 ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
