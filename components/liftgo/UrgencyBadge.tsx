import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Urgency } from '@/types/liftgo.types'
import { Clock, Zap, AlertCircle } from 'lucide-react'

interface UrgencyBadgeProps {
  urgency: Urgency
  className?: string
}

const urgencyConfig: Record<Urgency, { label: string; variant: string; icon: typeof Clock }> = {
  normalno: { 
    label: 'Normalno', 
    variant: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
    icon: Clock
  },
  kmalu: { 
    label: 'Kmalu', 
    variant: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
    icon: AlertCircle
  },
  nujno: { 
    label: 'Nujno', 
    variant: 'bg-red-100 text-red-700 hover:bg-red-100',
    icon: Zap
  }
}

export function UrgencyBadge({ urgency, className }: UrgencyBadgeProps) {
  const config = urgencyConfig[urgency]
  const Icon = config.icon

  return (
    <Badge className={cn(config.variant, 'font-medium gap-1', className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}
