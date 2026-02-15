'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { FileText, TrendingUp, Clock, DollarSign } from 'lucide-react'

export function PartnerStats({
  partnerId,
  offers,
}: {
  partnerId: string
  offers: any[]
}) {
  const supabase = createClient()
  const [stats, setStats] = useState({
    totalOffers: 0,
    activeOffers: 0,
    totalValue: 0,
    avgPrice: 0,
  })

  useEffect(() => {
    const calculateStats = () => {
      const active = offers.filter((o) => o.status === 'active').length
      const total = offers.reduce((sum, o) => sum + (o.price || 0), 0)
      const avg = offers.length > 0 ? total / offers.length : 0

      setStats({
        totalOffers: offers.length,
        activeOffers: active,
        totalValue: total,
        avgPrice: avg,
      })
    }

    calculateStats()
  }, [offers])

  const statCards = [
    {
      icon: FileText,
      label: 'Skupna ponudb',
      value: stats.totalOffers,
      color: 'text-blue-500',
    },
    {
      icon: TrendingUp,
      label: 'Aktivne ponudbe',
      value: stats.activeOffers,
      color: 'text-green-500',
    },
    {
      icon: DollarSign,
      label: 'Povprečna cena',
      value: `€${stats.avgPrice.toFixed(2)}`,
      color: 'text-amber-500',
    },
    {
      icon: Clock,
      label: 'Skupna vrednost',
      value: `€${stats.totalValue.toFixed(2)}`,
      color: 'text-purple-500',
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
