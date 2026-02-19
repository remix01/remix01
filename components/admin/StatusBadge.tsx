import { cn } from '@/lib/utils'

type Status = 'AKTIVEN' | 'PENDING' | 'SUSPENDIRAN' | 'ZAVRNJEN' | 'NEAKTIVEN'

interface StatusBadgeProps {
  status: Status
}

const statusConfig = {
  AKTIVEN: {
    label: 'Aktiven',
    className: 'bg-green-100 text-green-800',
  },
  PENDING: {
    label: 'Čaka',
    className: 'bg-yellow-100 text-yellow-800',
  },
  SUSPENDIRAN: {
    label: 'Suspendiran',
    className: 'bg-red-100 text-red-800',
  },
  ZAVRNJEN: {
    label: 'Zavrnjen',
    className: 'bg-gray-100 text-gray-800',
  },
  NEAKTIVEN: {
    label: 'Neaktiven',
    className: 'bg-gray-100 text-gray-800',
  },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  )
}
