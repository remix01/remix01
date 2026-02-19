import { Badge } from '@/components/ui/badge'

type Status = 'AKTIVEN' | 'NEAKTIVEN' | 'SUSPENDIRAN' | 'PENDING' | 'ZAVRNJEN'

interface StatusBadgeProps {
  status: Status
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    AKTIVEN: { label: 'Aktiven', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
    NEAKTIVEN: { label: 'Neaktiven', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
    SUSPENDIRAN: { label: 'Suspendiran', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
    PENDING: { label: 'Čaka', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
    ZAVRNJEN: { label: 'Zavrnjen', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  }

  const { label, className } = config[status]

  return (
    <Badge className={className} variant="secondary">
      {label}
    </Badge>
  )
}
