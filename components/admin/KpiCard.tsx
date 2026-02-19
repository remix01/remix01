import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: string | number
  change?: number
  icon: LucideIcon
  badge?: number
}

export function KpiCard({ title, value, change, icon: Icon, badge }: KpiCardProps) {
  const isPositive = change && change > 0
  const hasChange = change !== undefined && change !== 0

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {hasChange && (
                <span
                  className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    isPositive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  )}
                >
                  {isPositive ? '+' : ''}
                  {change}%
                </span>
              )}
            </div>
          </div>
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            {badge !== undefined && badge > 0 && (
              <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {badge}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
