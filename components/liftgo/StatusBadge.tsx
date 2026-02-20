import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PovprasevanjeStatus, PonudbaStatus } from '@/types/liftgo.types'

interface StatusBadgeProps {
  status: PovprasevanjeStatus | PonudbaStatus
  className?: string
}

const povprasevanjeConfig: Record<PovprasevanjeStatus, { label: string; variant: string }> = {
  odprto: { label: 'Odprto', variant: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  v_teku: { label: 'V teku', variant: 'bg-orange-100 text-orange-700 hover:bg-orange-100' },
  zakljuceno: { label: 'Zaključeno', variant: 'bg-green-100 text-green-700 hover:bg-green-100' },
  preklicano: { label: 'Preklicano', variant: 'bg-gray-100 text-gray-700 hover:bg-gray-100' }
}

const ponudbaConfig: Record<PonudbaStatus, { label: string; variant: string }> = {
  poslana: { label: 'Poslana', variant: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
  sprejeta: { label: 'Sprejeta', variant: 'bg-green-100 text-green-700 hover:bg-green-100' },
  zavrnjena: { label: 'Zavrnjena', variant: 'bg-red-100 text-red-700 hover:bg-red-100' }
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = status in povprasevanjeConfig 
    ? povprasevanjeConfig[status as PovprasevanjeStatus]
    : ponudbaConfig[status as PonudbaStatus]

  return (
    <Badge className={cn(config.variant, 'font-medium', className)}>
      {config.label}
    </Badge>
  )
}
