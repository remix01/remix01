import { 
  AlertTriangle, 
  ShieldOff, 
  ShieldAlert, 
  UserX, 
  AlertCircle 
} from 'lucide-react'
import { Card } from '@/components/ui/card'

interface StatsCardsProps {
  stats: {
    violationsToday: number
    violationsThisWeek: number
    violationsThisMonth: number
    blockedMessagesToday: number
    highRiskJobs: number
    suspendedCraftworkers: number
    disputedJobs: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Violations Today',
      value: stats.violationsToday,
      subtitle: `${stats.violationsThisWeek} this week · ${stats.violationsThisMonth} this month`,
      icon: AlertTriangle,
      color: 'text-amber-500',
    },
    {
      title: 'Blocked Messages',
      value: stats.blockedMessagesToday,
      subtitle: 'Messages blocked today',
      icon: ShieldOff,
      color: 'text-red-500',
    },
    {
      title: 'High Risk Jobs',
      value: stats.highRiskJobs,
      subtitle: 'Jobs with risk score ≥ 70',
      icon: ShieldAlert,
      color: 'text-orange-500',
    },
    {
      title: 'Suspended Craftworkers',
      value: stats.suspendedCraftworkers,
      subtitle: 'Currently suspended',
      icon: UserX,
      color: 'text-red-600',
    },
    {
      title: 'Disputed Jobs',
      value: stats.disputedJobs,
      subtitle: 'Requiring review',
      icon: AlertCircle,
      color: 'text-purple-500',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title} className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {card.title}
              </p>
              <p className="text-3xl font-bold text-foreground">
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground">
                {card.subtitle}
              </p>
            </div>
            <card.icon className={`h-8 w-8 ${card.color}`} />
          </div>
        </Card>
      ))}
    </div>
  )
}
