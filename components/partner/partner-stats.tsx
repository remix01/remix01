'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { FileText, TrendingUp, Star, Inbox } from 'lucide-react'

export function PartnerStats({
  offers,
  openRequestsCount,
  averageRating,
}: {
  offers: any[]
  openRequestsCount: number
  averageRating: number
}) {
  const [stats, setStats] = useState({
    activeOffers: 0,
    acceptedOffers: 0,
  })

  useEffect(() => {
    const calculateStats = () => {
      const active = offers.filter((o) => o.status === 'poslana').length
      const accepted = offers.filter((o) => o.status === 'sprejeta').length

      setStats({
        activeOffers: active,
        acceptedOffers: accepted,
      })
    }

    calculateStats()
  }, [offers])

  const statCards = [
    {
      icon: TrendingUp,
      label: 'Aktivne ponudbe',
      value: stats.activeOffers,
      color: 'text-green-500',
    },
    {
      icon: FileText,
      label: 'Sprejete ponudbe',
      value: stats.acceptedOffers,
      color: 'text-amber-500',
    },
    {
      icon: Star,
      label: 'Povprečna ocena',
      value: averageRating > 0 ? averageRating.toFixed(1) : '—',
      color: 'text-purple-500',
    },
    {
      icon: Inbox,
      label: 'Odprta povpraševanja',
      value: openRequestsCount,
      color: 'text-blue-500',
    },
  ]

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
              <Icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </Card>
        )
      })}
    </div>
  )
}
